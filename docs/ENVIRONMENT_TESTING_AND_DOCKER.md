# TemporalGuard Environment, Testing, SigNoz, and Docker Guide

Codex must inspect existing environment and Docker files first, preserve working behavior, and create `.env.example` files without real secrets.

## 1. Frontend Environment Variables

Suggested names; adapt to existing naming conventions:

```bash
NEXT_PUBLIC_APP_NAME=TemporalGuard
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_DEFAULT_ENVIRONMENT=production
NEXT_PUBLIC_SIGNOZ_MODE=local
NEXT_PUBLIC_SIGNOZ_UI_URL=http://localhost:3301
```

Rules:

- Product and authentication requests use `NEXT_PUBLIC_API_BASE_URL`; there is
  no browser runtime mock mode.
- Tests may inject adapters or intercept requests without changing component code.
- No SigNoz API key, ingestion key, Cloudinary API secret, JWT secret, or database credential may use `NEXT_PUBLIC_`.

## 2. Backend Environment Variables

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/temporalguard

JWT_ACCESS_SECRET=replace-with-long-random-value
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=replace-with-separate-long-random-value
JWT_REFRESH_TTL=30d
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=temporalguard/workspaces

FRONTEND_ORIGIN=http://localhost:3000
```

If the backend uses separate database variables instead of `DATABASE_URL`, follow the existing convention.

## 3. SigNoz Local/Cloud Switching

No live product integration is required now, but configuration should be ready.

### Local mode

```bash
SIGNOZ_MODE=local
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_HEADERS=
SIGNOZ_UI_URL=http://localhost:3301
```

Self-hosted SigNoz normally does not require a cloud ingestion key.

### Cloud mode

```bash
SIGNOZ_MODE=cloud
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.<region>.signoz.cloud:443
OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key=<write-only-ingestion-key>
SIGNOZ_UI_URL=https://<your-workspace>.signoz.cloud
```

Keep these values in the backend/collector environment, not the frontend bundle.

A future server-side SigNoz query integration may require a separate read-capable API key. It must never be exposed to the browser.

### Collector routing

Prefer one OTel Collector configuration with environment substitution or two explicit exporter fragments:

```yaml
exporters:
  otlp/signoz:
    endpoint: ${env:OTEL_EXPORTER_OTLP_ENDPOINT}
    headers:
      signoz-ingestion-key: ${env:SIGNOZ_INGESTION_KEY}
```

For local mode, use the existing known-good exporter and omit unsupported empty authentication headers.

Do not replace a working local SigNoz install without evidence. Current SigNoz documentation uses Foundry for new standalone Docker installations; legacy repository-bundled compose setups are deprecated. Existing project infrastructure should be audited before migration.

## 4. Cloudinary Upload Configuration

- Backend owns the Cloudinary API secret.
- Validate image before upload.
- Use a predictable folder and generated public ID.
- Store both secure URL and public ID.
- Delete the old asset when logo replacement is later implemented.
- Attempt cleanup if registration fails after an upload.
- Do not trust MIME type alone; inspect image metadata if the current stack supports it.

Suggested constraints:

```text
accepted types: image/jpeg, image/png, image/webp
maximum size: 5 MB
minimum dimensions: 128 × 128
maximum dimensions: reasonable server-defined limit
```

## 5. Docker Requirements

### Frontend Dockerfile

- Multi-stage build.
- Frozen lockfile install.
- Build in a clean stage.
- Run as non-root.
- Use Next.js standalone output when compatible.
- Add health check if deployment platform uses it.

### Backend Dockerfile

- Preserve existing Dockerfile where possible.
- Include only production dependencies in runtime stage.
- Run TypeORM migrations through an explicit deployment command, not automatically in every replica unless the repository already handles locking safely.

### Compose modes

Implemented profile structure:

```yaml
services:
  web: {}
  api: {}
  postgres: {}
  redis: {}
  otel-collector:
    profiles: [observability-local]
  otel-collector-cloud:
    profiles: [observability-cloud]
```

Actual local SigNoz may be maintained in a separate Foundry-generated or existing compose project. Do not duplicate it just to match this sample.

Verified commands:

```bash
# Application only
docker compose up --build

# Application with existing local SigNoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  docker compose --profile observability-local up --build

# Application exporting telemetry through the cloud collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-cloud:4318 \
SIGNOZ_CLOUD_OTLP_ENDPOINT=https://ingest.<region>.signoz.cloud:443 \
SIGNOZ_INGESTION_KEY=<write-only-key> \
  docker compose --profile observability-cloud up --build
```

Compose configuration and both application image builds were verified on
2026-07-24.

## 6. Frontend Test Matrix

### Static checks

```text
format check
lint
TypeScript typecheck
production build
```

### Unit tests

- Login/signup schemas.
- File validation.
- Event canonical-name validation.
- Near-duplicate event detection.
- Rule validation for each operator.
- Sequence ordering.
- Rule sentence formatting.
- Storage parsing/migration.
- Duration formatting.

### Component tests

- Login form errors and loading.
- Signup file preview/remove/replace.
- Theme switch.
- Metric card states.
- Event selector search/grouping.
- Inline event creation.
- Query operator switching.
- Sequence keyboard reordering.
- Violation drawer.

### E2E tests

1. Open signup, submit invalid fields, verify accessible errors.
2. Select a valid logo, verify preview, and complete signup through the API.
3. Login through the API and verify success and safe failure scenarios.
4. Switch light/dark theme and reload.
5. Navigate dashboard routes.
6. Use global time/environment filters.
7. Open recent violation details.
8. Open a workflow and inspect timeline tabs.
9. Build an `any` rule.
10. Build an `all` rule.
11. Build and reorder a `sequence` rule.
12. Build a `forbid` rule.
13. Search for a missing event, create it inline, and verify it becomes selected.
14. Reload and verify event/rule draft persistence.
15. Verify mobile navigation and builder stages.

### Backend tests

- Registration success.
- Duplicate email.
- Invalid logo.
- Cloudinary failure compensation.
- Login success/failure.
- Password hash never returned.
- Refresh rotation/reuse handling if implemented.
- Logout revocation.
- `/auth/me` protection.
- Transaction rollback.

## 7. Manual QA

Review at minimum:

```text
390 × 844 mobile
768 × 1024 tablet
1440 × 900 desktop
1920 × 1080 wide desktop
```

For both themes:

- Login.
- Signup.
- Dashboard overview.
- Live workflows.
- Violations.
- Query Builder.
- Event creation.
- Drawers/dialogs.
- Loading, empty, error, and partial states.

## 8. Final Codex Report

Codex must create `docs/IMPLEMENTATION_REPORT.md` containing:

- Repository architecture discovered.
- Decisions and assumptions.
- Files added/changed.
- Dependencies added/removed and why.
- Database entities and migrations.
- Environment variables.
- How to run frontend and backend.
- How to run local/cloud observability modes.
- How to execute every test suite.
- Commands actually run and results.
- Known limitations.
- Deferred API integrations.
- Screens/routes implemented.
- Any questions still requiring product decisions.
