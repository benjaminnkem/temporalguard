# Skills and Tooling for Codex

These are implementation aids, not product features.

## Required abilities

- Read/edit the monorepo.
- Run package manager.
- Run Docker Compose.
- Run migrations.
- Run Redis workers.
- Run Playwright.
- Validate YAML.
- Run Terraform.
- Run Foundry.
- Inspect Git history and diffs.

## Useful integrations

### GitHub

Repository, issues, CI, review, and draft PR after explicit approval.

### Playwright/browser automation

Responsive, theme, streaming, graph, and demo testing.

### shadcn tooling

Accessible reusable primitives.

### PostgreSQL tooling

Schema, query plan, index, and migration review.

### Docker tooling

Compose, logs, health, networks, and image review.

### Terraform tooling

`fmt`, `validate`, and SigNoz asset plan.

## Official docs to prefer

- SigNoz.
- OpenTelemetry.
- Render.
- NestJS.
- TypeORM.
- Next.js.
- TanStack Query.
- Terraform provider.

## Repository instruction areas

Frontend:

- Design system.
- Query conventions.
- URL state.
- Loading/errors.
- Accessibility.
- Charts.

Backend:

- Modules.
- DTO validation.
- Company scope.
- Transactions.
- Migrations.
- Errors.
- OTel attributes.

Observability:

- Attribute naming.
- Redaction.
- Query limits.
- Evidence citations.
- Mode switching.
- Credential policy.

Infrastructure:

- Foundry files.
- Compose merge.
- Render generation.
- Terraform.
- Destructive safeguards.

## Validation commands

- Install.
- Lint.
- Typecheck.
- Unit.
- Integration.
- E2E.
- Builds.
- Compose config.
- Collector dry run.
- Foundry gauge/forge.
- Terraform fmt/validate.
- Empty-database migration.
- Full health.
- OTel verification.

## Guardrails

- Do not alter live secrets.
- Do not reset databases without confirmation.
- Do not deploy without approval.
- Do not apply Terraform to live SigNoz without approval.
- Plan before apply.
- Never commit secrets.
