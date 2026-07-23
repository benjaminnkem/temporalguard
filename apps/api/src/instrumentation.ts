/**
 * OpenTelemetry SDK bootstrap.
 *
 * Must be imported before any NestJS application code so auto-instrumentation
 * can patch modules. Exports traces and metrics to the local OTEL collector
 * (self-hosted SigNoz) over OTLP/HTTP.
 *
 * Env (Docker Compose defaults):
 *   OTEL_SERVICE_NAME=temporalguard-api
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
 *   OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const serviceName = process.env.OTEL_SERVICE_NAME || 'temporalguard-api';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const environment = process.env.NODE_ENV || 'development';

if (otlpEndpoint) {
  // OTLP HTTP exporters use protobuf by default (http/protobuf).
  // Endpoint is the collector base URL; paths are appended below.
  const baseUrl = otlpEndpoint.replace(/\/$/, '');

  const traceExporter = new OTLPTraceExporter({
    url: `${baseUrl}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${baseUrl}/v1/metrics`,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  });

  const sdk = new NodeSDK({
    resource: defaultResource().merge(
      resourceFromAttributes({
        'service.name': serviceName,
        'service.version': '0.1.0',
        'deployment.environment': environment,
      }),
    ),
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down'))
      .catch((error: unknown) =>
        console.error('Error shutting down OpenTelemetry SDK', error),
      );
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
