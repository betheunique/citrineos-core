// Voltu OCPP proxy (Mode B: "run in parallel with the incumbent").
//
// A charger is re-pointed at this proxy instead of directly at its vendor CSMS (Statiq/Tata/Ather). For each
// charger connection the proxy opens an upstream WebSocket to the incumbent CSMS and relays every frame both
// ways VERBATIM, so the incumbent keeps full control (RemoteStart/Stop, profiles, auth) exactly as before.
// The proxy is passive: it never injects or modifies a frame. It only FORKS a read-only copy of what the
// charger reports into the Voltu `citrine-bridge`, so Voltu gets energy / status / SoC without a partnership.
//
// OCPP-J framing (JSON arrays over the WebSocket):
//   Call        [2, "<uniqueId>", "<action>", {payload}]      (charger -> CSMS: the requests we harvest)
//   CallResult  [3, "<uniqueId>", {payload}]                  (CSMS -> charger: carries the 1.6 transactionId)
//   CallError   [4, "<uniqueId>", "<code>", "<desc>", {...}]
// Station id comes from the last path segment of the connect URL (as CitrineOS uses ocppConnectionName). The
// WebSocket subprotocol (ocpp1.6 / ocpp2.0.1) and the Authorization header are passed upstream untouched so the
// incumbent authenticates the charger normally.
//
// 1.6 transactionId: a StartTransaction.req has none (it is assigned in the .conf the CSMS returns). Because the
// proxy sees BOTH directions live, it buffers the StartTransaction by uniqueId and, when the matching CallResult
// comes back from the CSMS, injects the transactionId and forks the StartTransaction envelope.
//
// TLS: run this behind the same nginx that terminates wss for chargers (the proxy listens plain ws). If a
// charger validates the vendor's server certificate (OCPP security profile 2/3 / pinning), a transparent proxy
// cannot sit in the middle — that charger must use Mode A (Voltu as CSMS) or the off-the-shelf sub-meter path.
//
// Durability note: the fork is BEST-EFFORT (bounded retry, then drop-with-log). The bridge is idempotent, so a
// dropped StartTransaction is reconstructed by StopTransaction/MeterValues. For guaranteed durability use Mode A
// (the DB-tailing emitter). Aggregate signals (reliability, energy) tolerate the occasional miss.
//
// Env:
//   VOLTU_PROXY_UPSTREAM      Incumbent CSMS WS base, e.g. wss://ocpp.vendor.com  (the charger's original host). REQUIRED.
//   VOLTU_BRIDGE_URL          URL of the deployed citrine-bridge function. REQUIRED.
//   CITRINE_BRIDGE_SECRET     HMAC secret; must match the bridge. REQUIRED.
//   VOLTU_PROXY_PORT          Listen port (default 9310).
//   VOLTU_PROXY_START_TTL_S   Drop a buffered StartTransaction with no response after this many seconds (default 30).

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { createHmac } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[voltu-proxy] missing required env ${name}`);
    process.exit(1);
  }
  return v;
}

const UPSTREAM = requireEnv('VOLTU_PROXY_UPSTREAM').replace(/\/$/, '');
const BRIDGE_URL = requireEnv('VOLTU_BRIDGE_URL');
const SECRET = requireEnv('CITRINE_BRIDGE_SECRET');
const PORT = Number(process.env.VOLTU_PROXY_PORT ?? 9310);
const START_TTL_MS = Number(process.env.VOLTU_PROXY_START_TTL_S ?? 30) * 1000;

const FORWARDED_ACTIONS = new Set([
  'BootNotification',
  'Heartbeat',
  'StatusNotification',
  'MeterValues',
  'TransactionEvent', // 2.0.1
  'StartTransaction', // 1.6
  'StopTransaction', // 1.6
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Best-effort signed POST of one forked event. Never throws into the relay path.
async function emitToBridge(action: string, stationId: string, payload: unknown): Promise<void> {
  const body = JSON.stringify({ type: action, chargingStationId: stationId, payload });
  const sig = createHmac('sha256', SECRET).update(body).digest('hex');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BRIDGE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-voltu-signature': sig },
        body,
      });
      if (res.ok) return;
      // 4xx (bad signature/data) will not fix on retry — stop.
      if (res.status >= 400 && res.status < 500) {
        console.error(`[voltu-proxy] fork rejected ${res.status} for ${action} ${stationId}`);
        return;
      }
    } catch {
      // network error -> retry
    }
    await sleep(400 * (attempt + 1));
  }
  console.error(`[voltu-proxy] fork dropped after retries: ${action} ${stationId}`);
}

interface PendingStart {
  payload: Record<string, unknown>;
  ts: number;
}

function stationIdFromUrl(url: string | undefined): string {
  const path = (url ?? '/').split('?')[0];
  const seg = path.split('/').filter(Boolean).pop();
  return seg ? decodeURIComponent(seg) : 'unknown';
}

function asText(data: RawData, isBinary: boolean): string | null {
  return isBinary ? null : data.toString('utf8');
}

const wss = new WebSocketServer({
  port: PORT,
  // Echo the charger's OCPP subprotocol (ocpp1.6 / ocpp2.0.1) so the handshake succeeds.
  handleProtocols: (protocols: Set<string>) => {
    const first = protocols.values().next().value;
    return first ?? false;
  },
});

wss.on('listening', () => console.log(`[voltu-proxy] listening on :${PORT} -> ${UPSTREAM}`));

wss.on('connection', (client: WebSocket, req: IncomingMessage) => {
  const stationId = stationIdFromUrl(req.url);
  const path = (req.url ?? '/').startsWith('/') ? (req.url ?? '/') : `/${req.url ?? ''}`;
  const subprotocol = client.protocol; // negotiated with the charger

  const headers: Record<string, string> = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;

  const upstream = new WebSocket(UPSTREAM + path, subprotocol ? [subprotocol] : [], { headers });

  const pendingStarts = new Map<string, PendingStart>();
  const clientBuffer: Array<{ data: RawData; isBinary: boolean }> = [];
  let upstreamOpen = false;
  let closed = false;

  const closeBoth = () => {
    if (closed) return;
    closed = true;
    try {
      client.close();
    } catch {
      /* ignore */
    }
    try {
      upstream.close();
    } catch {
      /* ignore */
    }
  };

  upstream.on('open', () => {
    upstreamOpen = true;
    for (const f of clientBuffer) upstream.send(f.data, { binary: f.isBinary });
    clientBuffer.length = 0;
  });

  // charger -> CSMS: relay verbatim, then fork a read-only copy.
  client.on('message', (data: RawData, isBinary: boolean) => {
    if (upstreamOpen && upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary });
    } else {
      clientBuffer.push({ data, isBinary });
    }
    const text = asText(data, isBinary);
    if (text) forkFromCharger(text, stationId, pendingStarts);
  });

  // CSMS -> charger: relay verbatim, and capture the StartTransaction response (1.6 transactionId).
  upstream.on('message', (data: RawData, isBinary: boolean) => {
    if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
    const text = asText(data, isBinary);
    if (text) captureConf(text, stationId, pendingStarts);
  });

  client.on('close', closeBoth);
  client.on('error', closeBoth);
  upstream.on('close', closeBoth);
  upstream.on('error', (err) => {
    console.error(`[voltu-proxy] upstream error for ${stationId}:`, err.message);
    closeBoth();
  });
});

// Parse a charger->CSMS frame; fork the actions we harvest. StartTransaction is buffered until its response.
function forkFromCharger(
  text: string,
  stationId: string,
  pendingStarts: Map<string, PendingStart>,
): void {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return;
  }
  if (!Array.isArray(msg) || msg[0] !== 2) return; // Calls only
  const uniqueId = String(msg[1]);
  const action = String(msg[2]);
  const payload = (msg[3] ?? {}) as Record<string, unknown>;
  if (!FORWARDED_ACTIONS.has(action)) return;

  if (action === 'StartTransaction' && payload.transactionId == null) {
    // Drop stale buffered starts before adding (bounds the map on a long-lived connection).
    const cutoff = Date.now() - START_TTL_MS;
    for (const [k, v] of pendingStarts) if (v.ts < cutoff) pendingStarts.delete(k);
    pendingStarts.set(uniqueId, { payload, ts: Date.now() });
    return; // wait for the conf to supply transactionId
  }
  void emitToBridge(action, stationId, payload);
}

// Parse a CSMS->charger frame; if it answers a buffered StartTransaction, inject the transactionId and fork.
function captureConf(
  text: string,
  stationId: string,
  pendingStarts: Map<string, PendingStart>,
): void {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return;
  }
  if (!Array.isArray(msg) || msg[0] !== 3) return; // CallResult only
  const uniqueId = String(msg[1]);
  const pending = pendingStarts.get(uniqueId);
  if (!pending) return;
  pendingStarts.delete(uniqueId);
  const result = (msg[2] ?? {}) as { transactionId?: unknown };
  const payload = { ...pending.payload };
  if (result.transactionId != null) payload.transactionId = result.transactionId;
  void emitToBridge('StartTransaction', stationId, payload);
}

const shutdown = () => {
  wss.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
