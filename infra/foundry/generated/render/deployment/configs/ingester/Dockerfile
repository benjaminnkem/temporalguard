FROM signoz/signoz-otel-collector:latest

COPY ingester.yaml /etc/otel/config.yaml
COPY opamp.yaml /etc/otel/manager-config.yaml

ENTRYPOINT ["/signoz-otel-collector"]
CMD ["--config=/etc/otel/config.yaml"]
