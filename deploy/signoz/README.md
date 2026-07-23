# Self-hosted SigNoz (local)

Configs vendored from the official [SigNoz Docker deployment](https://github.com/SigNoz/signoz/tree/main/deploy)
(v0.128.x family), integrated into TemporalGuard’s Compose stack.

## Layout

```
deploy/signoz/
├── otel-collector-config.yaml      # OTLP receive → ClickHouse export
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

No SigNoz Cloud credentials or ingestion keys are used.
