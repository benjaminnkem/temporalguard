# Implementation Verification Report

Updated: July 25, 2026

## Implemented in this upgrade

- Durable processing schema, explicit migrations, encrypted SigNoz connection
  secrets, audit tables, stable BullMQ IDs, retries, dead-lettering,
  cancellation, progress, company concurrency, worker health, and shutdown.
- Typed SigNoz v5 Query Range client for traces, logs, and metrics with
  service-account authentication, cloud/self-hosted configuration, company
  filters, allowlists, range/row bounds, redaction, query audit, timeout,
  retry, cancellation, rate limiting, and circuit breaking.
- Server-only connection management/validation and safe deep links. The web
  receives no SigNoz service-account or ingestion credential.
- Durable investigation start/read/list/cancel/rerun/export and SSE event
  replay using `Last-Event-ID`.
- Worker investigation execution with workflow context, bounded tools,
  SigNoz evidence, evidence persistence, cohort comparison, completeness
  scoring, deterministic contributor ranking, tool-call audit, strict final
  JSON, evidence-citation enforcement, prompt-injection neutralization, and an
  explicit no-remediation contract.
- Disabled deterministic provider mode and opt-in OpenAI-compatible synthesis.
- API/worker/investigation/SigNoz tracing conventions and hardened collector
  configurations for self-hosted and cloud modes.
- OTLP trace/log/metric verification script and SigNoz stub-server policy
  tests.
- Real API-backed investigations, evidence graph, comparisons, historical
  simulations, deployments, workflow explorer, platform health, connection,
  telemetry quality, and observability-asset frontend surfaces.
- TanStack Query caching/reconnect behavior, named SSE event reconciliation,
  URL-backed filters, skeleton/empty/partial-failure/offline states, keyboard
  evidence traversal, an equivalent evidence table, and persisted citations.
- Comparison dimensions for success/violation, on-time/late, deployment
  versions, and telemetry quality; deployment observations discovered from
  evidence; event-ingestion and investigation operational instruments.
- Official SigNoz Terraform provider module with seven dashboards and eight
  initially disabled alerts. Apply requires a reviewed saved plan and an exact
  interactive confirmation phrase.

## Verification log

| Command                                          | Result                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter api build`                        | Passed after SigNoz and investigation integration.                                                                          |
| `pnpm --filter worker build`                     | Passed after worker runtime dependency alignment.                                                                           |
| `pnpm check-types`                               | Passed for API, web, worker, and shared packages.                                                                           |
| `pnpm --filter api test -- --runInBand`          | Passed: 10 suites, 34 tests.                                                                                                |
| `pnpm --filter web test`                         | Passed: 3 files, 14 tests.                                                                                                  |
| `pnpm build`                                     | Passed for API, worker, and production web build.                                                                           |
| `docker compose config --quiet`                  | Passed for base, `observability-local`, and `observability-cloud`.                                                          |
| Cloud collector native `validate`                | Passed with placeholder endpoint/key.                                                                                       |
| Self-hosted collector startup parse              | Pipeline parsed and components built; standalone run then failed resolving the expected Compose-only `clickhouse` hostname. |
| Clean database `pnpm --filter api migration:run` | Passed all 11 migrations, including durable processing and investigation runtime; disposable database was removed.          |
| `pnpm signoz:fmt`                                | Passed using Terraform 1.14.3 in Docker.                                                                                    |
| `pnpm signoz:validate`                           | Passed with official `SigNoz/signoz` provider v0.0.17 and no warnings.                                                      |
| `pnpm --filter web test`                         | Passed after frontend observability work: 4 files, 15 tests.                                                                |
| Targeted new Playwright tests                    | Passed on desktop and mobile: investigations list and platform-health API metrics (4 tests).                                |

## Recorded failures

- Non-mutating API lint reports six pre-existing Prettier errors in business
  settings/API-key files and migration `1722500000000`. All files added or
  changed for this implementation pass lint.
- Web lint still fails because its existing `--max-warnings 0` policy sees 13
  pre-existing warnings.
- API e2e boots successfully after the new module wiring fix; 2 of 4 tests fail
  because the developer database has not run migration `1722500000000`
  (`businesses.website` is missing). The clean-database run proves the full
  migration chain succeeds.
- Web Playwright remains at 19 passed and 7 failed: the existing rule-builder
  controls are not found in desktop/mobile cases and mobile violation
  navigation times out.
- Live trace/log/metric export verification requires reachable SigNoz
  credentials and is provided as `pnpm verify:signoz`; it was not run against a
  user deployment.
