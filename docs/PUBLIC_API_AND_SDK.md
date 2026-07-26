# TemporalGuard Public API & SDK

**Document status:** Frozen for implementation (P0 complete)  
**Audience:** Platform engineers building TemporalGuard; customers integrating via API/SDK  
**Related docs:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/API_AND_DATA_CONTRACTS.md` (control plane only)

---

## 1. Purpose

This document defines TemporalGuard’s **external data plane**: the stable HTTP API and official SDKs that customer applications use to send business events into a workspace.

It is intentionally separate from the **control plane** documented in `docs/API_AND_DATA_CONTRACTS.md` (session auth, dashboard, rules UI, settings UI).

| Plane | Consumers | Auth | Stability |
| --- | --- | --- | --- |
| Control plane | TemporalGuard web app | Session cookies / JWT | Evolves with the product UI |
| **Public data plane** | Customer services, workers, SDKs | **Workspace API keys** | Versioned; breaking changes only in new major versions |

**Control-plane doc pointer:** anything under session auth, rules CRUD, dashboards, and Settings UI stays in `API_AND_DATA_CONTRACTS.md`. Customer ingest and SDKs follow **this** document only.

---

## 2. Goals and non-goals

### 2.1 Goals

- Let customers send **event occurrences** so TemporalGuard can evaluate rules, open workflows, and record violations.
- Identify every write as belonging to a **business/workspace** via API keys (no shared secrets across customers).
- Provide a **Mixpanel-like developer experience**: short SDK methods, clear docs, curl quickstart, predictable errors.
- Keep ingest **fast to acknowledge**; evaluation and fan-out may be asynchronous after accept.
- Ship **one primary language SDK first** (Node/TypeScript) on top of a frozen HTTP contract.

### 2.2 Non-goals (v1)

- Browser/public write keys in end-user clients (leaks workspace write access). **Server-side only** for v1.
- Full CRUD of rules, dashboards, or violations via public API.
- Query APIs for analytics (read path stays in the control plane / UI).
- Multi-language SDKs beyond Node in the first release.
- Guaranteed exactly-once delivery (at-least-once with optional client idempotency).

---

## 3. Audiences (v1)

1. **Backend / platform engineers** instrumenting services and workers.  
2. **Data / integration engineers** shipping events from ETL or message consumers.  
3. **TemporalGuard** maintainers implementing the API and SDK.

**Explicitly deferred:** front-end browser SDK for direct page tracking.

---

## 4. Tenancy and environments

### 4.1 Workspace

Every API key belongs to exactly one **business** (workspace). All ingested events are scoped to that business.

### 4.2 Environment model (decision)

**API key implies environment.**

- Keys are created with an environment: `live` | `test` (display prefixes `tg_live_` / `tg_test_`).
- Events ingested with a key inherit that environment; clients **must not** send a conflicting environment field in v1.
- Optional later: allow an event-level environment override only for keys marked multi-env (not in v1).

**Product mapping:** API key `live` → product environment `production`; API key `test` → product environment `staging` (shell filters and rule `environments`).

Rationale: simpler mental model, safer defaults, matches common observability practice (separate prod/dev tokens).

### 4.3 Event catalogue

- **Preferred:** customers send `event` names that exist in the workspace catalogue.  
- **v1 behavior:** unknown event names are **accepted and stored**; they are auto-registered via existing `findOrCreateByName` as discovered definitions for use in Rule Studio.  
- Rules only evaluate against events they reference; unknown names do not break ingest.

---

## 5. Authentication

### 5.1 API keys

Created and revoked in the TemporalGuard UI (**Settings → API keys**) or later via control-plane APIs.

| Property | Behavior |
| --- | --- |
| Secret format | `tg_live_<random>` or `tg_test_<random>` |
| Storage | **Hash only** (Argon2); never store full secret after creation |
| Display | Prefix + fingerprint; secret shown **once** at creation |
| Revocation | Soft revoke (`revokedAt`); immediate rejection of new requests |
| Metadata | Name, createdAt, lastUsedAt, environment (P2) |

Existing create path already returns `secret` once, stores `keyPrefix` + `keyHash`, and updates `lastUsedAt` on authenticate.

### 5.2 Request authentication (public API)

Clients MUST send the key using **one** of:

```http
X-API-Key: tg_live_...
```

or

```http
Authorization: Bearer tg_live_...
```

**Rules for public `/api/v1/*` routes (P1):**

- Prefer resolving credentials in this order: `X-API-Key` → `Authorization: Bearer` when the token starts with `tg_`.
- Do **not** accept session JWT on public data-plane routes (API-key only). Session remains control-plane only.
- SDKs send `Authorization: Bearer`. Curl examples may use either header.

**Current code gap:** `ApiKeyGuard` / `WorkspaceAuthGuard` only read `x-api-key`. Bearer is treated as JWT on session routes. P1 public guard must accept Bearer secrets starting with `tg_`.

Invalid / revoked / missing key → `401` with code `AUTH_INVALID_API_KEY` or `AUTH_UNAUTHORIZED`.

### 5.3 Scopes (v1 minimal)

v1 keys are **write-only for events** (implicit scope `events:write`).

Future scopes (document only; not implemented in v1):

- `events:write`
- `events:read` (if public read ever exists)
- `definitions:write`

### 5.4 Control plane vs data plane

| Action | Auth |
| --- | --- |
| Create / list / revoke API keys | Session (UI / control plane) |
| Update business profile | Session |
| Track events | API key |
| Manage rules, view dashboards | Session |

---

## 6. Versioning and base URLs

### 6.1 URL scheme

Public API is versioned under `/v1`:

```text
Production (illustrative):  https://api.temporalguard.com/v1
Local monorepo:             {API_ORIGIN}/api/v1
```

Where `{API_ORIGIN}` is the Nest app (default local port from config, often `http://localhost:3000` or `4000` depending on env). Global Nest prefix is already `api`, so controllers register as `v1/events`.

All public endpoints live under `/api/v1/...` in this monorepo so they sit beside existing control-plane routes without colliding.

### 6.2 Compatibility policy

- Additive changes (new optional fields, new endpoints) are allowed in `v1`.  
- Breaking changes require `v2`.  
- Deprecated fields remain for at least one minor release cycle after deprecation notice in docs.

### 6.3 Relationship to legacy ingest

Today, internal ingest exists as:

```text
POST /api/event-logs
```

Body shape (legacy, control/internal):

```json
{
  "eventName": "payment.authorized",
  "timestamp": "2026-07-25T12:00:00.000Z",
  "externalWorkflowId": "payment_123",
  "payload": { "amount": 1000 }
}
```

Auth: session JWT **or** `X-API-Key` via `WorkspaceAuthGuard`.

**Public contract for customers and SDKs is only:**

```text
POST /api/v1/events
POST /api/v1/events/batch
```

Legacy `/api/event-logs` remains for internal/backward use and maps to the same engine. It is **not** documented as the SDK contract and must not be called by `temporalguard-node`.

---

## 7. Core resource: events

### 7.1 Conceptual model

A **track event** is one occurrence of a named business fact:

- **name** — canonical event name (e.g. `document.uploaded`)  
- **time** — when it happened in the business process  
- **correlation** — how to join this occurrence to a workflow instance  
- **properties** — free-form attributes for analysis and rule filters  
- **context** — optional service / deployment / trace linkage  

TemporalGuard uses name + correlation (+ time) to attach the occurrence to workflow evaluation.

### 7.2 Single event: `POST /v1/events`

**Auth:** API key required (no session).

#### Request body

```json
{
  "event": "document.uploaded",
  "timestamp": "2026-07-25T12:00:00.000Z",
  "correlation": {
    "key": "document.id",
    "value": "doc_123"
  },
  "properties": {
    "region": "eu-west-1",
    "fileSizeBytes": 204800
  },
  "context": {
    "service": "documents-api",
    "deployment": "documents-api@2.8.1",
    "traceId": "f65e9d0a41b94734b9fd93ce0b132b44",
    "spanId": "a1b2c3d4e5f60718"
  },
  "idempotencyKey": "doc_123:document.uploaded:2026-07-25T12:00:00.000Z"
}
```

#### Field specification

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `event` | yes | string | Canonical name; lowercase dot notation preferred (`a.b`) |
| `timestamp` | yes | string (ISO-8601) | Occurrence time; not “time received” |
| `correlation.key` | yes* | string | *Required unless `externalId` is provided |
| `correlation.value` | yes* | string | Entity / business key value |
| `externalId` | no | string | Preferred client workflow id when the integrator already has one |
| `properties` | no | object | Max keys / depth / size limits (see §9) |
| `context.service` | no | string | Emitting service name |
| `context.deployment` | no | string | Version or image tag |
| `context.traceId` | no | string | For SigNoz / evidence correlation |
| `context.spanId` | no | string | Optional span |
| `idempotencyKey` | no | string | If repeated within retention window, return prior success without double-applying |

**Validation rules (v1):**

- `event`: 1–200 chars; recommend `/^[a-z][a-z0-9]*(?:[._][a-z][a-z0-9]*)+$/` but accept broader (`^[A-Za-z0-9._:-]{1,200}$`) and store as sent.  
- `timestamp`: must parse as date; reject > 24h in the future; allow past up to 30 days (configurable).  
- At least one of: (`correlation.key` + `correlation.value`) or `externalId`.  
- `correlation.value` / `externalId`: 1–512 chars.  
- Reject non-object `properties` / `context`.  
- `idempotencyKey`: 1–128 chars when present.

#### Success response `202 Accepted`

```json
{
  "id": "elog_01J...",
  "accepted": true,
  "duplicate": false
}
```

| Field | Meaning |
| --- | --- |
| `id` | Server id for the stored occurrence (use event log UUID; optional `elog_` prefix later) |
| `accepted` | Ingest accepted |
| `duplicate` | `true` if `idempotencyKey` matched a prior request |

**HTTP status decision (frozen):** always **202** on successful public ingest (sync or async evaluation). Do not return `200` for public track. Internal `/event-logs` may keep its current status.

#### Error responses

See §8.

---

### 7.3 Batch: `POST /v1/events/batch`

**Auth:** API key required.

```json
{
  "events": [
    {
      "event": "document.uploaded",
      "timestamp": "2026-07-25T12:00:00.000Z",
      "correlation": { "key": "document.id", "value": "doc_1" }
    },
    {
      "event": "document.scan_completed",
      "timestamp": "2026-07-25T12:00:05.000Z",
      "correlation": { "key": "document.id", "value": "doc_1" }
    }
  ]
}
```

| Limit | v1 default |
| --- | --- |
| Max events per batch | 100 |
| Max body size | 512 KB |
| Partial success | **No** in v1 — whole batch rejected if any item is invalid |

#### Success `202 Accepted`

```json
{
  "accepted": true,
  "count": 2,
  "results": [
    { "id": "…", "duplicate": false },
    { "id": "…", "duplicate": false }
  ]
}
```

Order of `results` matches order of `events`.

---

### 7.4 Mapping to internal engine (implementation contract)

Public handlers must adapt to the existing ingest pipeline (`EventLogsService.ingest` / workflow engine). Do not expose internal DTO field names on the wire.

| Public field | Internal target | Mapping rule |
| --- | --- | --- |
| `event` | `CreateEventLogDto.eventName` | Direct |
| `timestamp` | `CreateEventLogDto.timestamp` | ISO string |
| `externalId` | `CreateEventLogDto.externalWorkflowId` | Prefer when present |
| `correlation` | `externalWorkflowId` + payload metadata | See below |
| `properties` | `CreateEventLogDto.payload` (merged) | Base payload object |
| `context.service` | `payload._tg.service` (and optional columns later) | Nested under reserved `_tg` |
| `context.deployment` | `payload._tg.deployment` | Same |
| `context.traceId` | `EventLog.traceId` if column empty, else payload | Prefer entity columns when set from client context |
| `context.spanId` | `EventLog.spanId` similarly | Same |
| API key env | workflow/event environment when available | P2; hard-code `live` until then |
| `idempotencyKey` | lookup table or unique constraint | Scoped by `businessId` + key |

**Correlation → external workflow id (frozen):**

```text
if externalId is present:
  externalWorkflowId = externalId
else:
  externalWorkflowId = "{correlation.key}:{correlation.value}"
```

Also store:

```json
{
  "_tg": {
    "correlation": { "key": "document.id", "value": "doc_123" },
    "service": "documents-api",
    "deployment": "…",
    "idempotencyKey": "…"
  }
}
```

merged into `payload` alongside customer `properties` (customer keys must not be stripped; if customer sends `_tg`, nest under `_tg.customer` or reject `_tg` top-level key — **reject reserved `_tg` in properties** for v1).

**Workflow evaluation:** the current engine only processes rules when an external workflow record exists. Public ingest **must always** resolve an `externalWorkflowId` via the rule above so rule evaluation is not silently skipped. Reject with `VALIDATION_ERROR` if neither correlation nor `externalId` is usable.

**Response id:** return the created `EventLog.id` (UUID string is fine for v1).

---

## 8. Error model

All public errors use a consistent JSON body:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable summary.",
  "details": [
    { "path": "correlation.value", "message": "Required" }
  ],
  "requestId": "req_..."
}
```

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid payload |
| 401 | `AUTH_UNAUTHORIZED` | Missing credentials |
| 401 | `AUTH_INVALID_API_KEY` | Bad or revoked key |
| 403 | `AUTH_FORBIDDEN` | Key valid but not allowed (future scopes) |
| 409 | `CONFLICT` | Reserved |
| 413 | `PAYLOAD_TOO_LARGE` | Body / batch too large |
| 429 | `RATE_LIMITED` | Throttle exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Do not** return stack traces or upstream vendor errors to public clients.

**SDK mapping:** throw typed errors with `status`, `code`, `message`, `details`, `requestId`.

---

## 9. Limits and reliability

### 9.1 Defaults (v1 — frozen for ship)

| Limit | Value |
| --- | --- |
| Request body | 512 KB |
| Batch size | 100 events |
| Properties max keys | 50 |
| Properties max depth | 3 |
| Property string value max | 2 KB |
| Rate limit (per key) | 120 requests / minute |
| Idempotency key retention | 24 hours |
| Timestamp max future skew | 24 hours |
| Timestamp max age | 30 days |

Tune later behind config; document any production overrides.

### 9.2 Delivery semantics

- **At-least-once:** clients may retry.  
- **Idempotency:** if `idempotencyKey` is provided, duplicates return the same `id` with `duplicate: true`.  
- Without idempotency key, retries may create duplicate occurrences (engine should be resilient).

**Idempotency storage (frozen for P1):** Postgres unique constraint on `(businessId, idempotencyKey)` with a small table (e.g. `event_ingest_idempotency`) storing `eventLogId` and `expiresAt`. Redis optional later for hot path.

### 9.3 Ordering

TemporalGuard does **not** guarantee global ordering across services. Rule evaluation for sequences uses event timestamps and observed order within a correlation key / external workflow id.

---

## 10. SDK design (Node / TypeScript first)

### 10.1 Package

| Item | Value |
| --- | --- |
| Package name | `temporalguard-node` (npm) |
| Monorepo path | `packages/node` |
| Runtime | Node 18+ |
| Module | ESM + CJS dual publish preferred; ESM-first acceptable for v0 |
| Types | bundled `.d.ts` |
| HTTP | native `fetch` (Node 18+) |

Browser package deferred (`@temporalguard/browser` later with different threat model).

### 10.2 Monorepo layout (target)

```text
packages/node/
  package.json          # name: temporalguard-node
  tsconfig.json
  src/
    index.ts            # public exports
    client.ts           # TemporalGuard class
    types.ts            # options, track options, errors
    http.ts             # fetch wrapper, retries
    buffer.ts           # batch buffer + flush
  README.md             # quickstart
  test/
    client.test.ts
```

Root `pnpm-workspace.yaml` already includes `packages/*`. Wire turbo `build` / `check-types` / `test` scripts like other packages.

Do **not** depend on Nest or the web app. SDK is a pure HTTP client.

### 10.3 Configuration

```ts
type TemporalGuardOptions = {
  apiKey: string;
  /** Default: https://api.temporalguard.com/api/v1  (local: http://localhost:3000/api/v1) */
  baseUrl?: string;
  /** Flush interval for buffered track calls; default 2000 ms */
  flushIntervalMs?: number;
  /** Max events buffered before forced flush; default 20 */
  flushAt?: number;
  /** HTTP timeout; default 10000 ms */
  timeoutMs?: number;
  /** Max retry attempts for 429 / 5xx; default 3 */
  maxRetries?: number;
  /** Optional default context merged into every event */
  defaultContext?: {
    service?: string;
    deployment?: string;
  };
};
```

Env convenience (optional, non-breaking):

```text
TEMPORALGUARD_API_KEY
TEMPORALGUARD_BASE_URL
```

SDK does not read env automatically unless the consumer passes `process.env.*` — keep constructor explicit.

### 10.4 Public methods

| Method | Description |
| --- | --- |
| `track(event, options)` | Enqueue one event; returns `Promise<void>` when enqueued (not necessarily sent) |
| `trackAndFlush(event, options)` | Send immediately; returns `Promise<TrackResult>` |
| `flush()` | Send all buffered events; uses batch when count > 1 |
| `shutdown()` | Flush, clear timers, reject further tracks |

#### Types

```ts
type TrackOptions = {
  timestamp?: Date | string; // default: now (UTC ISO)
  correlation?: { key: string; value: string }; // required unless externalId
  properties?: Record<string, unknown>;
  context?: {
    service?: string;
    deployment?: string;
    traceId?: string;
    spanId?: string;
  };
  externalId?: string;
  idempotencyKey?: string;
};

type TrackResult = {
  id: string;
  accepted: true;
  duplicate: boolean;
};

type FlushResult = {
  accepted: true;
  count: number;
  results: Array<{ id: string; duplicate: boolean }>;
};

class TemporalGuardError extends Error {
  status: number;
  code: string;
  details?: Array<{ path?: string; message: string }>;
  requestId?: string;
}
```

### 10.5 Behavior

- Buffer small volumes; flush via `POST /v1/events/batch` when buffered count > 1.  
- Single-event flush may use `POST /v1/events`.  
- Merge `defaultContext` under each event’s `context` (event-level wins).  
- Default `timestamp` to `new Date().toISOString()` when omitted.  
- Retries: exponential backoff on `429` / `5xx` (default 3 attempts, honor `Retry-After` when present).  
- Do not retry `401` / `400` / `413`.  
- `shutdown()` for graceful process exit (important for workers).  
- After `shutdown()`, further `track` calls throw.  
- Auth header: `Authorization: Bearer ${apiKey}`.

### 10.6 Method map (SDK → HTTP)

| SDK | HTTP |
| --- | --- |
| `track` (buffered) | eventually `POST /v1/events/batch` |
| `trackAndFlush` | `POST /v1/events` |
| `flush` (1 event) | `POST /v1/events` |
| `flush` (2+ events) | `POST /v1/events/batch` |

### 10.7 Example (illustrative)

```ts
import { TemporalGuard } from "temporalguard-node";

const tg = new TemporalGuard({
  apiKey: process.env.TEMPORALGUARD_API_KEY!,
  baseUrl: process.env.TEMPORALGUARD_BASE_URL, // optional
  defaultContext: { service: "documents-api" },
});

await tg.track("document.uploaded", {
  correlation: { key: "document.id", value: documentId },
  properties: { region: "eu-west-1" },
  context: { deployment: process.env.GIT_SHA },
});

await tg.shutdown();
```

### 10.8 SDK test strategy

- Unit tests with mocked `fetch` (request shape, retries, buffer flush).  
- Optional integration test against local API when `TG_E2E=1` and a real key exist.  
- Do not require Docker for default package unit tests.

---

## 11. Security

- Hash API keys at rest; show secret once.  
- Rate limit per key and per business.  
- Enforce body size and property limits.  
- Prefer TLS in production.  
- Log `apiKeyId` / prefix on ingest for audit — never log full secrets.  
- v1 keys are server-side secrets; document that browser embedding is unsupported.  
- Settings UI for key create/revoke stays session-authenticated.  
- Reject customer `properties._tg` (reserved namespace).

---

## 12. Control plane touchpoints (already in product)

| UI | Role |
| --- | --- |
| Settings → Business | Workspace display name / metadata |
| Settings → API keys | Create, list, revoke keys; copy secret once |
| Events / Live / Rules | Observe outcomes of public ingest |

No change required to those UX goals for the public API design. P2 may add environment selector on create-key.

---

## 13. Phased rollout

| Phase | Deliverable | Exit criteria |
| --- | --- | --- |
| **P0** | This document frozen | Stakeholders agree HTTP + SDK surface |
| **P1** | Nest `POST /api/v1/events` + `/batch`; API-key-only guard with Bearer/`X-API-Key`; map to ingest engine; public error envelope; idempotency table; OpenAPI tag `public-v1` | curl appendix works against local API |
| **P2** | Settings API keys: `tg_live_` / `tg_test_`, `environment` column, last-used already exists | UI + mint path match §5 |
| **P3** | `temporalguard-node` in `packages/node` (track, batch flush, retries, shutdown) | unit tests green; example against P1 |
| **P4** | Public docs / package README quickstart (curl + Node) | copy-paste path for integrators |
| **P5** | Optional: auto-discover polish; metrics per key; more languages | as needed |

**Order constraint:** no SDK release before P1 HTTP behavior matches §7–§9.

---

## 14. Decisions log

| Decision | Choice | Rationale |
| --- | --- | --- |
| Primary consumer v1 | Server / workers | Avoid browser key leakage |
| Auth | Workspace API keys only on `/v1` | Multi-tenant attribution; no session on public plane |
| Bearer + X-API-Key | Both; SDK uses Bearer | Standard HTTP + curl/gateway flexibility |
| Environment | Key implies env | Safer, simpler |
| Versioning | `/api/v1` | Industry standard |
| Hero endpoint | `POST /v1/events` | Mixpanel-like track |
| Batch | Explicit `/v1/events/batch` | Clear limits, SDK buffering |
| Success status | Always 202 | Signals accepted-for-processing |
| Unknown events | Accept + findOrCreate | Lower friction for integrators |
| Correlation mapping | `externalId` else `key:value` | Stable workflow binding without new engine |
| Reserved payload | `_tg` namespace | Context without schema churn |
| Idempotency store | Postgres first | Consistent with monorepo stack |
| Rate limit v1 | 120 req/min/key | Simple default |
| SDK language 1 | Node TypeScript | Matches monorepo and backend customers |
| SDK package path | `packages/node` | Workspace-native |
| Legacy `/event-logs` | Keep internal; not SDK contract | Avoid dual public contracts |

---

## 15. Open questions — resolved for v1

| # | Question | Resolution |
| --- | --- | --- |
| 1 | Rate limits free vs paid | Single default 120/min/key until billing exists |
| 2 | 202 vs 200 | **202 only** on public track |
| 3 | Idempotency backend | **Postgres** unique table, 24h TTL job optional |
| 4 | `externalId` alone | **Allowed**; becomes `externalWorkflowId` |
| 5 | npm package | Publish as unscoped `temporalguard-node` |
| 6 | Response id format | Raw UUID ok in v1; prefix optional later (additive) |
| 7 | Async evaluation | P1 may still process sync inside request (current engine); status remains 202; move to queue later without contract change |

---

## 16. Gap analysis (codebase → this contract)

| Area | Today | P1 / P2 target |
| --- | --- | --- |
| Public routes | None under `/v1` | `v1/events`, `v1/events/batch` |
| Ingest body | `eventName`, `payload`, `externalWorkflowId` | Public adapter; keep internal DTO private |
| Auth on ingest | Session or `X-API-Key` | Public: API key only; Bearer `tg_*` + `X-API-Key` |
| Key prefixes | `tg_live_` / `tg_test_` + `environment` column | Shipped (P2) |
| Batch | No | Yes, max 100 |
| Idempotency | No | Yes, optional key |
| Correlation object | No | Yes, mapped to external workflow id |
| Context / traces from body | Only OTEL active span | Accept client `context.traceId` / `spanId` |
| OpenAPI | Single internal swagger | Tag or separate document for public surface |
| SDK package | Missing | `packages/node` |

---

## 17. Appendix A — curl quickstart (target)

```bash
export TG_API_KEY="tg_live_..."
export TG_BASE="http://localhost:3000/api/v1"

curl -sS -X POST "$TG_BASE/events" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TG_API_KEY" \
  -d '{
    "event": "document.uploaded",
    "timestamp": "2026-07-25T12:00:00.000Z",
    "correlation": { "key": "document.id", "value": "doc_123" },
    "properties": { "region": "eu-west-1" },
    "context": { "service": "documents-api" }
  }'
```

Expected:

```json
{ "id": "…", "accepted": true, "duplicate": false }
```

Batch:

```bash
curl -sS -X POST "$TG_BASE/events/batch" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TG_API_KEY" \
  -d '{
    "events": [
      {
        "event": "document.uploaded",
        "timestamp": "2026-07-25T12:00:00.000Z",
        "correlation": { "key": "document.id", "value": "doc_123" }
      },
      {
        "event": "document.scan_completed",
        "timestamp": "2026-07-25T12:00:05.000Z",
        "correlation": { "key": "document.id", "value": "doc_123" }
      }
    ]
  }'
```

---

## 18. Appendix B — OpenAPI fragment (normative sketch)

```yaml
openapi: 3.0.3
info:
  title: TemporalGuard Public API
  version: "1.0.0"
servers:
  - url: https://api.temporalguard.com/api/v1
  - url: http://localhost:3000/api/v1
paths:
  /events:
    post:
      operationId: trackEvent
      security:
        - ApiKeyHeader: []
        - BearerApiKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TrackEvent"
      responses:
        "202":
          description: Accepted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TrackEventResponse"
        "400":
          $ref: "#/components/responses/Error"
        "401":
          $ref: "#/components/responses/Error"
  /events/batch:
    post:
      operationId: trackEventsBatch
      security:
        - ApiKeyHeader: []
        - BearerApiKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [events]
              properties:
                events:
                  type: array
                  minItems: 1
                  maxItems: 100
                  items:
                    $ref: "#/components/schemas/TrackEvent"
      responses:
        "202":
          description: Accepted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TrackBatchResponse"
components:
  securitySchemes:
    ApiKeyHeader:
      type: apiKey
      in: header
      name: X-API-Key
    BearerApiKey:
      type: http
      scheme: bearer
  schemas:
    TrackEvent:
      type: object
      required: [event, timestamp]
      properties:
        event: { type: string, minLength: 1, maxLength: 200 }
        timestamp: { type: string, format: date-time }
        correlation:
          type: object
          required: [key, value]
          properties:
            key: { type: string }
            value: { type: string, maxLength: 512 }
        externalId: { type: string, maxLength: 512 }
        properties: { type: object, additionalProperties: true }
        context:
          type: object
          properties:
            service: { type: string }
            deployment: { type: string }
            traceId: { type: string }
            spanId: { type: string }
        idempotencyKey: { type: string, maxLength: 128 }
    TrackEventResponse:
      type: object
      required: [id, accepted, duplicate]
      properties:
        id: { type: string }
        accepted: { type: boolean, enum: [true] }
        duplicate: { type: boolean }
    TrackBatchResponse:
      type: object
      required: [accepted, count, results]
      properties:
        accepted: { type: boolean, enum: [true] }
        count: { type: integer }
        results:
          type: array
          items:
            type: object
            required: [id, duplicate]
            properties:
              id: { type: string }
              duplicate: { type: boolean }
  responses:
    Error:
      description: Error
      content:
        application/json:
          schema:
            type: object
            required: [code, message]
            properties:
              code: { type: string }
              message: { type: string }
              details:
                type: array
                items:
                  type: object
                  properties:
                    path: { type: string }
                    message: { type: string }
              requestId: { type: string }
```

Nest may generate an equivalent document from DTOs under a `public-v1` Swagger tag; this fragment is the source of truth if generated output drifts.

---

## 19. Appendix C — Glossary

| Term | Meaning |
| --- | --- |
| Workspace / business | Tenant owning data and keys |
| Event definition | Catalogue schema for a named event |
| Event occurrence / track | One instance of an event at a time |
| Correlation | Key/value joining steps of one business process |
| External workflow id | Internal binding id derived from correlation or `externalId` |
| Rule | Time-bound expectation over events |
| Violation | Rule failure for a correlated workflow |

---

## 20. Implementation checklist

### P1 — Nest public ingest

- [x] `ApiKeyGuard`: `X-API-Key` **or** `Authorization: Bearer tg_*`; public `/v1` is API-key only (no session).
- [x] Controller `POST v1/events` + `POST v1/events/batch`.
- [x] Public DTOs + class-validator matching §7.
- [x] Adapter → `EventLogsService.ingest` with mapping in §7.4.
- [x] Always set `externalWorkflowId` so the workflow engine runs.
- [x] Apply client `context.traceId` / `spanId` onto event log when provided.
- [x] Idempotency table + behavior (`event_ingest_idempotency`).
- [x] Body size 512 KB / batch max 100; validation errors use §8 envelope.
- [x] Rate limit 120/min (global Throttler; IP-based until key-aware tracker).
- [x] OpenAPI tag `public-v1` + api-key security schemes.
- [ ] Manual verify with Appendix A curl (local smoke after `pnpm --filter api start:dev`).

### P3 — `temporalguard-node`

- [x] Scaffold `packages/node` with build + types.
- [x] Implement client: buffer, flush, trackAndFlush, shutdown, retries.
- [x] Map methods per §10.6; auth Bearer header.
- [x] Typed errors per §8 / §10.4.
- [x] Unit tests with mocked fetch.
- [x] README quickstart pointing at this doc.

### P2 (can parallel after P1 start)

- [x] `environment` on API keys; mint `tg_test_` / `tg_live_`.
- [x] Settings UI environment on create.
- [x] Ingest inherits env from authenticated key (payload `_tg` + workflow metadata; rules filtered by product env).

---

## 21. Next step

**P0 is complete.** Proceed to:

1. **P1** — Nest public routes matching §7–§9.  
2. **P3** — Scaffold `temporalguard-node` only after (or tightly after) P1 endpoints exist and curl succeeds.  
3. **P2** can land in parallel for key environments.

No customer-facing SDK release until P1 HTTP behavior matches this document.
