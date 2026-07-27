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
import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { config as loadEnv } from 'dotenv';
import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Instrumentation is imported before Nest's ConfigModule initializes, so load
// the same app/root environment files before configuring the OTel exporters.
loadEnv({ path: ['../../.env', '.env'], quiet: true });

const serviceName = process.env.OTEL_SERVICE_NAME || 'temporalguard-api';
const configuredOtlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
  process.env.SIGNOZ_INGESTION_ENDPOINT ||
  process.env.SIGNOZ_CLOUD_OTLP_ENDPOINT;
const otlpEndpoint =
  configuredOtlpEndpoint &&
  (/^https?:\/\//.test(configuredOtlpEndpoint)
    ? configuredOtlpEndpoint
    : `http://${configuredOtlpEndpoint}`);
const ingestionKey = process.env.SIGNOZ_INGESTION_KEY;
const headers = ingestionKey
  ? { 'signoz-ingestion-key': ingestionKey }
  : undefined;
const environment = process.env.NODE_ENV || 'development';

if (otlpEndpoint) {
  // OTLP HTTP exporters use protobuf by default (http/protobuf).
  // Endpoint is the collector base URL; paths are appended below.
  const baseUrl = otlpEndpoint.replace(/\/$/, '');

  const traceExporter = new OTLPTraceExporter({
    url: `${baseUrl}/v1/traces`,
    headers,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${baseUrl}/v1/metrics`,
    headers,
  });
  const logExporter = new OTLPLogExporter({
    url: `${baseUrl}/v1/logs`,
    headers,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  });

  const resource = defaultResource().merge(
    resourceFromAttributes({
      'service.name': serviceName,
      'service.namespace': 'temporalguard',
      'service.version': '0.1.0',
      'deployment.environment.name': environment,
      'temporalguard.component': serviceName.endsWith('worker')
        ? 'worker'
        : 'api',
    }),
  );
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor({ exporter: logExporter })],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  const sdk = new NodeSDK({
    resource,
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
    Promise.all([sdk.shutdown(), loggerProvider.shutdown()])
      .then(() => console.log('OpenTelemetry SDK shut down'))
      .catch((error: unknown) =>
        console.error('Error shutting down OpenTelemetry SDK', error),
      );
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
