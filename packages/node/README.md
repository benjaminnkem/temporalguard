# `@temporalguard/node`

Official Node.js SDK for TemporalGuard’s **public data plane** (`POST /api/v1/events`).

Contract: [`docs/PUBLIC_API_AND_SDK.md`](../../docs/PUBLIC_API_AND_SDK.md).

## Install

From this monorepo (workspace):

```ts
import { TemporalGuard } from "@temporalguard/node";
```

When published to npm:

```bash
npm install @temporalguard/node
```

Requires **Node 18+** (native `fetch`).

## Quickstart

1. Create a workspace API key in TemporalGuard (**Settings → API keys**).
2. Instrument your service:

```ts
import { TemporalGuard } from "@temporalguard/node";

const tg = new TemporalGuard({
  apiKey: process.env.TEMPORALGUARD_API_KEY!,
  // Local API (Nest global prefix is /api):
  baseUrl: process.env.TEMPORALGUARD_BASE_URL ?? "http://localhost:3000/api/v1",
  defaultContext: { service: "documents-api" },
});

await tg.track("document.uploaded", {
  correlation: { key: "document.id", value: documentId },
  properties: { region: "eu-west-1" },
  context: { deployment: process.env.GIT_SHA },
});

// Workers / serverless: always flush on exit
await tg.shutdown();
```

## API

| Method | Behavior |
| --- | --- |
| `track(event, options)` | Buffer an event; auto-flush at `flushAt` or on interval |
| `trackAndFlush(event, options)` | Send one event immediately (`POST /events`) |
| `flush()` | Send the buffer (`POST /events` or `/events/batch`) |
| `shutdown()` | Flush, stop timers, reject further tracks |

Auth header: `Authorization: Bearer <apiKey>`.

### Options

```ts
type TemporalGuardOptions = {
  apiKey: string;
  baseUrl?: string; // default production API + /api/v1
  flushIntervalMs?: number; // default 2000
  flushAt?: number; // default 20
  timeoutMs?: number; // default 10000
  maxRetries?: number; // default 3 (429 / 5xx only)
  defaultContext?: { service?: string; deployment?: string };
};
```

### Track options

```ts
await tg.track("order.paid", {
  timestamp: new Date(), // default: now
  correlation: { key: "order.id", value: "ord_123" },
  // or: externalId: "ord_123",
  properties: { amount: 4200 },
  context: { traceId: "…" },
  idempotencyKey: "ord_123:order.paid",
});
```

## Errors

Failed API calls throw `TemporalGuardError`:

```ts
import { TemporalGuard, TemporalGuardError } from "@temporalguard/node";

try {
  await tg.trackAndFlush("document.uploaded", {
    correlation: { key: "document.id", value: "doc_1" },
  });
} catch (error) {
  if (error instanceof TemporalGuardError) {
    console.error(error.status, error.code, error.message, error.requestId);
  }
}
```

## Curl equivalent

```bash
curl -sS -X POST "http://localhost:3000/api/v1/events" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TG_API_KEY" \
  -d '{
    "event": "document.uploaded",
    "timestamp": "2026-07-25T12:00:00.000Z",
    "correlation": { "key": "document.id", "value": "doc_123" }
  }'
```

## Development

```bash
pnpm --filter @temporalguard/node test
pnpm --filter @temporalguard/node build
pnpm --filter @temporalguard/node check-types
```
