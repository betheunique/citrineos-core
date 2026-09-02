# @voltu/ocpp-proxy

A passive OCPP-J proxy that lets a charger run **in parallel** with its existing network. The charger is
re-pointed at this proxy; the proxy transparently relays every frame to the incumbent CSMS (Statiq / Tata /
Ather keep full control) and **forks a read-only copy** of what the charger reports into the Voltu
`citrine-bridge`. This is "Mode B" — get first-party telemetry without displacing the vendor and without a
partnership.

## Why this exists

OCPP is 1:1 and command-and-control: a charger keeps one connection to one CSMS at a time, so it can't natively
dual-report to Voltu and Statiq. But we don't need control to harvest data — only a copy of the stream. The
proxy sits between the charger and the incumbent, forwards everything untouched, and quietly mirrors the
telemetry to Voltu. In OCPP 2.0.1 terms it is a spec-legitimate **Local Controller**.

## How it works

- Charger connects to the proxy (`wss://…/<stationId>`, subprotocol `ocpp1.6`/`ocpp2.0.1`). The proxy opens an
  upstream WebSocket to the incumbent, **preserving the path, the subprotocol, and the Authorization header**,
  so the incumbent authenticates the charger exactly as before.
- Every frame is relayed **verbatim** in both directions. The proxy never injects or modifies a frame.
- It forks the charger's requests we care about (Boot, Heartbeat, StatusNotification, MeterValues,
  TransactionEvent, StartTransaction, StopTransaction) to the bridge as signed `{type, chargingStationId,
  payload}` envelopes.
- **1.6 transactionId** (absent in the StartTransaction request — it's only in the response): the proxy sees
  both directions, so it buffers the StartTransaction by its OCPP `uniqueId` and injects the transactionId when
  the matching CallResult comes back from the CSMS.

## Configuration

| Env | Required | Default | Meaning |
|---|---|---|---|
| `VOLTU_PROXY_UPSTREAM` | yes | — | Incumbent CSMS WS base (the charger's original host), e.g. `wss://ocpp.vendor.com`. |
| `VOLTU_BRIDGE_URL` | yes | — | URL of the deployed `citrine-bridge` function. |
| `CITRINE_BRIDGE_SECRET` | yes | — | HMAC secret; must match the bridge. |
| `VOLTU_PROXY_PORT` | no | `9310` | Listen port (plain ws; put nginx in front for wss). |
| `VOLTU_PROXY_START_TTL_S` | no | `30` | Drop a buffered StartTransaction with no response after this long. |

## Run

```bash
pnpm --filter @voltu/ocpp-proxy build
VOLTU_PROXY_UPSTREAM=wss://ocpp.vendor.com \
VOLTU_BRIDGE_URL=https://<project-ref>.supabase.co/functions/v1/citrine-bridge \
CITRINE_BRIDGE_SECRET=<same-as-bridge> \
pnpm --filter @voltu/ocpp-proxy start
```

## Limits (know these before promising coverage)

- **TLS / cert-pinning.** Run behind the same nginx that terminates wss for chargers (the proxy listens plain
  ws). If a charger validates the vendor's server certificate (OCPP security profile 2/3 / pinning), a
  transparent proxy can't sit in the middle — that charger needs Mode A (Voltu as CSMS) or the off-the-shelf
  sub-meter path. Feasible on the common India 1.6 fleet running profile 1 (basic auth) or plain ws.
- **Best-effort fork.** Delivery to the bridge is bounded-retry then drop-with-log (the bridge is idempotent, so
  a dropped StartTransaction is reconstructed by StopTransaction/MeterValues). For guaranteed durability use the
  DB-tailing `@voltu/bridge-emitter` (Mode A). Aggregate signals tolerate the occasional miss.
- **Re-point still required.** The proxy removes the "displace the incumbent" problem, not the "re-point the
  OCPP URL" step — the charger points at the proxy instead of directly at the vendor.
