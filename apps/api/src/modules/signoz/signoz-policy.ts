import { BadRequestException } from '@nestjs/common';
import type { SafeFilter, SigNozSignal } from './signoz.types';

const commonFields = new Set([
  'service.name',
  'service.version',
  'deployment.environment',
  'trace_id',
  'span_id',
  'timestamp',
  'duration_nano',
  'status_code',
  'name',
  'severity_text',
  'body',
  'temporalguard.workflow.id',
  'temporalguard.rule.id',
  'temporalguard.violation.id',
  'temporalguard.investigation.id',
  'temporalguard.event.name',
  'temporalguard.company.id_hash',
]);

const signalFields: Record<SigNozSignal, Set<string>> = {
  traces: new Set([...commonFields, 'has_error', 'http.response.status_code']),
  logs: new Set([...commonFields, 'severity_number']),
  metrics: new Set([...commonFields, 'metric_name', 'temporality']),
};

const metricNamePattern = /^[a-zA-Z_:][a-zA-Z0-9_.:]{0,254}$/;

export function assertAllowedFilters(
  signal: SigNozSignal,
  filters: SafeFilter[],
): void {
  for (const filter of filters) {
    if (!signalFields[signal].has(filter.field)) {
      throw new BadRequestException({
        code: 'SIGNOZ_FIELD_NOT_ALLOWED',
        message: `Field ${filter.field} is not allowed for ${signal}`,
      });
    }
    if (
      ['exists', 'not_exists'].includes(filter.operator) &&
      filter.value !== undefined
    ) {
      throw new BadRequestException({
        code: 'SIGNOZ_FILTER_INVALID',
        message: `${filter.operator} does not accept a value`,
      });
    }
    if (
      !['exists', 'not_exists'].includes(filter.operator) &&
      filter.value === undefined
    ) {
      throw new BadRequestException({
        code: 'SIGNOZ_FILTER_INVALID',
        message: `${filter.operator} requires a value`,
      });
    }
    if (
      ['in', 'not_in'].includes(filter.operator) &&
      !Array.isArray(filter.value)
    ) {
      throw new BadRequestException({
        code: 'SIGNOZ_FILTER_INVALID',
        message: `${filter.operator} requires an array`,
      });
    }
  }
}

export function assertMetricName(name: string): void {
  if (!metricNamePattern.test(name)) {
    throw new BadRequestException({
      code: 'SIGNOZ_METRIC_NOT_ALLOWED',
      message: 'Metric name is invalid',
    });
  }
}

export function allowedSelectFields(
  signal: SigNozSignal,
  requested: string[] = [],
): string[] {
  const defaults =
    signal === 'traces'
      ? ['timestamp', 'trace_id', 'span_id', 'name', 'service.name']
      : signal === 'logs'
        ? ['timestamp', 'trace_id', 'span_id', 'severity_text', 'body']
        : [];
  const fields = requested.length ? requested : defaults;
  for (const field of fields) {
    if (!signalFields[signal].has(field)) {
      throw new BadRequestException({
        code: 'SIGNOZ_FIELD_NOT_ALLOWED',
        message: `Select field ${field} is not allowed for ${signal}`,
      });
    }
  }
  return fields;
}
