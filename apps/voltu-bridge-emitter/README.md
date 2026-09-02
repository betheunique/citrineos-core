# @voltu/bridge-emitter

A tiny, standalone sidecar that streams own-station telemetry from **CitrineOS** into **Voltu**. It runs next
to CitrineOS on the Oracle box, reads CitrineOS's `OCPPMessages` table, and POSTs signed envelopes to the
Voltu `citrine-bridge` edge function. **It does not modify CitrineOS core** — the fork stays upstream-mergeable.

## Why it exists

CitrineOS is the CSMS (it speaks OCPP 1.6J and 2.0.1 to the chargers). Voltu needs a copy of the telemetry
(energy/kWh, status, heartbeats, SoC where ISO 15118 supplies it) to list the station in the network, drive
the reliability score, and feed battery-health. This emitter is that pipe, and because it advances its cursor
only after the bridge acknowledges, it is also the **off-box durability replica**: a total loss of the Oracle
box cannot take already-replicated sessions with it.

## How it works

CitrineOS's router persists **every** received message to `OCPPMessages` (unconditionally, via the
`WebhookDispatcher`). This process tails that table on an integer-`id` cursor:

1. Select new received Calls (`origin='cs'`, `type=2`) for the actions we care about — BootNotification,
   Heartbeat, StatusNotification, MeterValues, TransactionEvent (2.0.1), StartTransaction / StopTransaction (1.6).
2. For a **1.6 StartTransaction** (whose request carries no transactionId — it is only in the CSMS response),
   join the matching response by `correlationId` and inject the `transactionId`.
3. HMAC-SHA256 sign the JSON body with `CITRINE_BRIDGE_SECRET` (`x-voltu-signature`) and POST to the bridge.
4. Advance the persisted cursor **only after** the bridge returns 2xx.

Delivery is **at-least-once**; the bridge is idempotent (upserts keyed by transaction / connector), so a retry
after any outage is safe and self-healing.

## Configuration

| Env | Required | Default | Meaning |
|---|---|---|---|
| `VOLTU_DATABASE_URL` | yes | — | Postgres connection string for the CitrineOS DB. A read-only user plus rights on the small `voltu_bridge_emitter_state` cursor table is enough. |
| `VOLTU_BRIDGE_URL` | yes | — | URL of the deployed `citrine-bridge` function. |
| `CITRINE_BRIDGE_SECRET` | yes | — | HMAC secret; must match the bridge's. |
| `VOLTU_EMITTER_POLL_MS` | no | `2000` | Idle poll interval. |
| `VOLTU_EMITTER_BATCH` | no | `200` | Max rows per tick. |
| `VOLTU_EMITTER_START_CUTOFF_S` | no | `30` | How long to wait for a StartTransaction's response before skipping it (prevents a stuck cursor). |

## Run

```bash
pnpm --filter @voltu/bridge-emitter build
VOLTU_DATABASE_URL=postgres://user:pass@localhost:5432/citrine \
VOLTU_BRIDGE_URL=https://<project>.functions.supabase.co/citrine-bridge \
CITRINE_BRIDGE_SECRET=<same-as-bridge> \
pnpm --filter @voltu/bridge-emitter start
```

Deploy it as its own container/service in the same compose stack as CitrineOS (it only needs network access to
the CitrineOS Postgres and to the Voltu bridge URL). The cursor lives in the DB, so restarts resume exactly.

## Scope / notes

- Read-only against CitrineOS domain data; the only table it writes is its own cursor (`voltu_bridge_emitter_state`).
- `chargingStationId` in the envelope is CitrineOS's `ocppConnectionName`. Single-tenant deployments are
  assumed; if you run multiple tenants with colliding connection names, extend the envelope + bridge with `tenantId`.
- SoC is only present on ISO-15118 sessions (mostly DC fast chargers); on AC/slow chargers you still get
  energy + status + reliability, and SoH stays estimated (handled downstream by Voltu's provenance model).
