// Voltu bridge emitter.
//
// A standalone, read-only tail-replicator that runs next to CitrineOS on the Oracle box. It watches
// CitrineOS's own OCPPMessages table (every received message is persisted there by the router's
// WebhookDispatcher, unconditionally) and forwards the ones we care about to the Voltu `citrine-bridge`
// edge function as signed envelopes. It NEVER modifies CitrineOS core, so the fork stays upstream-mergeable.
//
// Why a DB tail rather than an in-process hook or the native webhook subscription:
//   - Durability. We advance a persisted cursor only after the bridge acknowledges, so a bridge/network
//     outage is backfilled automatically on recovery (at-least-once). The bridge is idempotent (upserts
//     keyed by transaction / connector), so re-delivery is safe. This IS the off-box durability replica.
//   - Zero core changes. CitrineOS already persists every message; we just read it.
//
// OCPP version handling:
//   - 2.0.1 sessions arrive as TransactionEvent; forwarded verbatim.
//   - 1.6 sessions arrive as StartTransaction / StopTransaction / MeterValues. The raw StartTransaction.req
//     has no transactionId (it is assigned in the .conf the CSMS sends back), so for StartTransaction we
//     join the matching CSMS response by correlationId and inject the transactionId before forwarding.
//
// Env:
//   VOLTU_DATABASE_URL        Postgres connection string for the CitrineOS DB (read-only user is enough,
//                             plus rights to create/update the small cursor table). REQUIRED.
//   VOLTU_BRIDGE_URL          URL of the deployed citrine-bridge function. REQUIRED.
//   CITRINE_BRIDGE_SECRET     HMAC secret; must match the bridge. REQUIRED.
//   VOLTU_EMITTER_POLL_MS     Poll interval when idle (default 2000).
//   VOLTU_EMITTER_BATCH       Max rows per tick (default 200).
//   VOLTU_EMITTER_START_CUTOFF_S  How long to wait for a StartTransaction's conf before skipping it
//                                 (default 30). Prevents a stuck cursor if a conf never lands.

import Pg from 'pg';
import { createHmac } from 'node:crypto';

const { Pool } = Pg;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[voltu-emitter] missing required env ${name}`);
    process.exit(1);
  }
  return v;
}

const DATABASE_URL = requireEnv('VOLTU_DATABASE_URL');
const BRIDGE_URL = requireEnv('VOLTU_BRIDGE_URL');
const SECRET = requireEnv('CITRINE_BRIDGE_SECRET');
const POLL_MS = Number(process.env.VOLTU_EMITTER_POLL_MS ?? 2000);
const BATCH = Number(process.env.VOLTU_EMITTER_BATCH ?? 200);
const START_CUTOFF_MS = Number(process.env.VOLTU_EMITTER_START_CUTOFF_S ?? 30) * 1000;

// The OCPP actions we replicate. Received Calls only (origin 'cs', type 2 = Call).
const FORWARDED_ACTIONS = [
  'BootNotification',
  'Heartbeat',
  'StatusNotification',
  'MeterValues',
  'TransactionEvent', // 2.0.1
  'StartTransaction', // 1.6
  'StopTransaction', // 1.6
];

const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });

interface MessageRow {
  id: string; // bigint comes back as a string from pg
  ocppConnectionName: string;
  action: string;
  protocol: string;
  payload: Record<string, unknown> | null;
  correlationId: string | null;
  timestamp: string;
}

async function ensureStateTable(): Promise<void> {
  await pool.query(`
    create table if not exists voltu_bridge_emitter_state (
      id              text primary key,
      last_message_id bigint not null default 0,
      updated_at      timestamptz not null default now()
    )`);
  await pool.query(
    `insert into voltu_bridge_emitter_state (id, last_message_id) values ('default', 0)
     on conflict (id) do nothing`,
  );
}

async function getCursor(): Promise<bigint> {
  const { rows } = await pool.query(
    `select last_message_id from voltu_bridge_emitter_state where id = 'default'`,
  );
  return BigInt(rows[0]?.last_message_id ?? 0);
}

async function setCursor(id: bigint): Promise<void> {
  await pool.query(
    `update voltu_bridge_emitter_state set last_message_id = $1, updated_at = now() where id = 'default'`,
    [id.toString()],
  );
}

async function fetchBatch(cursor: bigint): Promise<MessageRow[]> {
  const { rows } = await pool.query(
    `select id, "ocppConnectionName", action, protocol, payload, "correlationId", timestamp
       from "OCPPMessages"
      where id > $1 and origin = 'cs' and type = 2 and action = any($2::text[])
      order by id asc
      limit $3`,
    [cursor.toString(), FORWARDED_ACTIONS, BATCH],
  );
  return rows as MessageRow[];
}

// The CSMS-assigned transactionId for a 1.6 StartTransaction lives on the matching response
// (origin 'csms', type 3 = CallResult) sharing the correlationId.
async function lookupStartTransactionId(correlationId: string | null): Promise<string | null> {
  if (!correlationId) return null;
  const { rows } = await pool.query(
    `select payload from "OCPPMessages"
      where "correlationId" = $1 and origin = 'csms' and type = 3
      order by id asc limit 1`,
    [correlationId],
  );
  const payload = rows[0]?.payload as { transactionId?: unknown } | undefined;
  const txId = payload?.transactionId;
  return txId == null ? null : String(txId);
}

async function postToBridge(envelope: unknown): Promise<boolean> {
  const body = JSON.stringify(envelope);
  const signature = createHmac('sha256', SECRET).update(body).digest('hex');
  try {
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-voltu-signature': signature },
      body,
    });
    if (!res.ok) {
      console.error(`[voltu-emitter] bridge rejected: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[voltu-emitter] bridge post failed', err);
    return false;
  }
}

// Returns true if the batch was full (a backlog may remain -> drain immediately).
async function tick(): Promise<boolean> {
  const cursor = await getCursor();
  const rows = await fetchBatch(cursor);
  if (rows.length === 0) return false;

  let advancedTo = cursor;
  for (const row of rows) {
    const payload: Record<string, unknown> = { ...(row.payload ?? {}) };

    // 1.6 StartTransaction: stitch in the transactionId from the response, or defer/skip.
    if (row.action === 'StartTransaction' && payload.transactionId == null) {
      const txId = await lookupStartTransactionId(row.correlationId);
      if (txId == null) {
        const ageMs = Date.now() - new Date(row.timestamp).getTime();
        if (ageMs < START_CUTOFF_MS) {
          // The conf should land within milliseconds; stop here and retry so ordering is preserved.
          break;
        }
        console.warn(
          `[voltu-emitter] skipping StartTransaction id=${row.id} (${row.ocppConnectionName}): no response after cutoff`,
        );
        advancedTo = BigInt(row.id);
        continue;
      }
      payload.transactionId = txId;
    }

    const envelope = { type: row.action, chargingStationId: row.ocppConnectionName, payload };
    const ok = await postToBridge(envelope);
    if (!ok) break; // leave the cursor before this row; retry next tick (bridge is idempotent).
    advancedTo = BigInt(row.id);
  }

  if (advancedTo > cursor) await setCursor(advancedTo);
  return rows.length === BATCH && advancedTo === BigInt(rows[rows.length - 1].id);
}

let stopping = false;

async function loop(): Promise<void> {
  while (!stopping) {
    let drainAgain = false;
    try {
      drainAgain = await tick();
    } catch (err) {
      console.error('[voltu-emitter] tick error', err);
    }
    if (!drainAgain) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function main(): Promise<void> {
  console.log('[voltu-emitter] starting');
  await ensureStateTable();
  const shutdown = async () => {
    stopping = true;
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await loop();
}

main().catch((err) => {
  console.error('[voltu-emitter] fatal', err);
  process.exit(1);
});
