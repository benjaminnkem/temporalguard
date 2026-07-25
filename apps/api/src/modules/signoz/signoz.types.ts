import { z } from 'zod';

export const signozSignals = ['traces', 'logs', 'metrics'] as const;
export type SigNozSignal = (typeof signozSignals)[number];

export const filterOperatorSchema = z.enum([
  'eq',
  'neq',
  'in',
  'not_in',
  'exists',
  'not_exists',
  'gt',
  'gte',
  'lt',
  'lte',
]);
export type FilterOperator = z.infer<typeof filterOperatorSchema>;

export const safeFilterSchema = z.object({
  field: z.string().min(1).max(255),
  operator: filterOperatorSchema,
  value: z
    .union([
      z.string().max(1024),
      z.number().finite(),
      z.boolean(),
      z.array(z.union([z.string().max(1024), z.number().finite()])).max(100),
    ])
    .optional(),
});
export type SafeFilter = z.infer<typeof safeFilterSchema>;

export interface SigNozQueryInput {
  businessId: string;
  investigationId?: string;
  signal: SigNozSignal;
  from: Date;
  to: Date;
  filters: SafeFilter[];
  selectFields?: string[];
  limit?: number;
  metric?: {
    name: string;
    timeAggregation: 'avg' | 'sum' | 'min' | 'max' | 'rate' | 'increase';
    spaceAggregation:
      | 'avg'
      | 'sum'
      | 'min'
      | 'max'
      | 'p50'
      | 'p90'
      | 'p95'
      | 'p99';
  };
  abortSignal?: AbortSignal;
}

export interface SigNozQueryResult {
  queryId: string;
  signal: SigNozSignal;
  from: string;
  to: string;
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
}

export interface SigNozConnectionHealth {
  configured: boolean;
  authenticated: boolean;
  traces: boolean;
  logs: boolean;
  metrics: boolean;
  latencyMs: number;
  errorCode?: string;
}
