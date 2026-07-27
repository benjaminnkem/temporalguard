const sensitiveKey =
  /(authorization|cookie|token|secret|password|api[-_]?key|ingestion[-_]?key|email)/i;
const bearer = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const secretAssignment =
  /\b(token|secret|password|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi;

export function redactTelemetry(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[TRUNCATED]';
  if (typeof value === 'string') {
    return value
      .slice(0, 10_000)
      .replace(bearer, 'Bearer [REDACTED]')
      .replace(secretAssignment, '$1=[REDACTED]');
  }
  if (Array.isArray(value)) {
    return value.slice(0, 1000).map((item) => redactTelemetry(item, depth + 1));
  }
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 500)
      .map(([key, nested]) => [
        key,
        sensitiveKey.test(key)
          ? '[REDACTED]'
          : redactTelemetry(nested, depth + 1),
      ]),
  );
}
