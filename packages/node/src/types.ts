export type EventContext = {
  service?: string;
  deployment?: string;
  traceId?: string;
  spanId?: string;
};

export type EventCorrelation = {
  key: string;
  value: string;
};

export type TemporalGuardOptions = {
  apiKey: string;
  /** Default: https://api.temporalguard.com/api/v1 */
  baseUrl?: string;
  /** Flush interval for buffered track calls; default 2000 ms */
  flushIntervalMs?: number;
  /** Max events buffered before forced flush; default 20 */
  flushAt?: number;
  /** HTTP timeout; default 10000 ms */
  timeoutMs?: number;
  /** Max retry attempts for 429 / 5xx; default 3 */
  maxRetries?: number;
  /** Optional default context merged into every event */
  defaultContext?: EventContext;
  /** Optional fetch implementation (tests / custom agents) */
  fetch?: typeof fetch;
};

export type TrackOptions = {
  timestamp?: Date | string;
  /** Preferred for multi-step business processes. Required unless `externalId` is set. */
  correlation?: EventCorrelation;
  properties?: Record<string, unknown>;
  context?: EventContext;
  /** Client workflow id; used when correlation is omitted. */
  externalId?: string;
  idempotencyKey?: string;
};

export type TrackEventPayload = {
  event: string;
  timestamp: string;
  correlation?: EventCorrelation;
  externalId?: string;
  properties?: Record<string, unknown>;
  context?: EventContext;
  idempotencyKey?: string;
};

export type TrackResult = {
  id: string;
  accepted: true;
  duplicate: boolean;
};

export type FlushResult = {
  accepted: true;
  count: number;
  results: Array<{ id: string; duplicate: boolean }>;
};

export type ErrorDetail = {
  path?: string;
  message: string;
};

export type PublicErrorBody = {
  code?: string;
  message?: string;
  details?: ErrorDetail[];
  requestId?: string;
};
