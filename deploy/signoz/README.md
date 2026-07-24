# SigNoz local and cloud collector modes

Configs vendored from the official [SigNoz Docker deployment](https://github.com/SigNoz/signoz/tree/main/deploy)
(v0.128.x family), integrated into TemporalGuard’s Compose stack.

## Layout

```
deploy/signoz/
├── otel-collector-config.yaml       # OTLP receive → ClickHouse export
├── otel-collector-cloud-config.yaml # OTLP receive → SigNoz Cloud
├── otel-collector-opamp-config.yaml
└── clickhouse/
    ├── config.xml
    ├── users.xml
    ├── custom-function.xml
    ├── cluster.xml
    └── user_scripts/               # histogramQuantile binary (init container)
```

## Data path

```
TemporalGuard API
      │  OTLP/HTTP (protobuf)
      ▼
otel-collector  (signoz/signoz-otel-collector)
      │  ClickHouse exporters
      ▼
clickhouse
      ▲
      │  query
signoz UI  (http://localhost:3301)
```

The local profile uses no cloud credentials. Cloud export is isolated in
`otel-collector-cloud-config.yaml`; its ingestion key stays in the collector
environment and never enters the browser bundle.

## Commands

```sh
# Application plus the self-hosted stack
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  docker compose --profile observability-local up --build

# Application through the cloud collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-cloud:4318 \
SIGNOZ_CLOUD_OTLP_ENDPOINT=https://ingest.<region>.signoz.cloud:443 \
SIGNOZ_INGESTION_KEY=<write-only-key> \
  docker compose --profile observability-cloud up --build
```
