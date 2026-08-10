export function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.length > 8 ? `${value.slice(0, 3)}***${value.slice(-2)}` : '***';
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).map(key => [key, /key|token|secret|password/i.test(key) ? '***' : redact(record[key])]));
  }
  return value;
}
