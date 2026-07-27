# Official References

Checked July 24, 2026.

## SigNoz

- Docker self-hosting with Foundry:
  https://signoz.io/docs/install/docker/

- Render deployment with Foundry:
  https://signoz.io/docs/setup/render/

- Cloud/self-hosted ingestion differences:
  https://signoz.io/docs/ingestion/cloud-vs-self-hosted/

- Self-hosted ingestion:
  https://signoz.io/docs/ingestion/self-hosted/overview/

- Cloud ingestion:
  https://signoz.io/docs/ingestion/signoz-cloud/overview/

- Collector configuration:
  https://signoz.io/docs/opentelemetry-collection-agents/opentelemetry-collector/configuration/

- Service accounts:
  https://signoz.io/docs/manage/administrator-guide/iam/service-accounts/

- Metrics API:
  https://signoz.io/docs/metrics-management/query-range-api/

- Logs API:
  https://signoz.io/docs/logs-management/logs-api/overview/

- Traces API:
  https://signoz.io/docs/apm-and-distributed-tracing/traces-api/

- Querying:
  https://signoz.io/docs/querying/overview/

- Dashboard Terraform provider:
  https://signoz.io/docs/dashboards/terraform-provider-signoz/

- Alert Terraform provider:
  https://signoz.io/docs/alerts-management/terraform-provider-signoz/

- Dashboard import:
  https://signoz.io/docs/dashboards/import-dashboard/

- Alerts:
  https://signoz.io/docs/alerts/

## OpenTelemetry

- Collector deployment:
  https://opentelemetry.io/docs/collector/deploy/

- Gateway:
  https://opentelemetry.io/docs/collector/deploy/gateway/

- Agent-to-gateway:
  https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/

- Collector Docker:
  https://opentelemetry.io/docs/collector/install/docker/

## Render

- Blueprint:
  https://render.com/docs/blueprint-spec

- Private services:
  https://render.com/docs/private-services

- Redirects/rewrites:
  https://render.com/docs/redirects-rewrites

## Architecture facts used

- Current supported standalone SigNoz Docker installation is generated with
  Foundry.
- Foundry can generate a Render Blueprint.
- Cloud/self-hosted ingestion differs mainly by endpoint, auth, and TLS.
- Query Range serves logs, traces, and metrics.
- Service account keys use `SIGNOZ-API-KEY`.
- Collector gateways centralize processing and export.
- Render private services communicate on the private network.
