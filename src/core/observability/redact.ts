/**
 * Redaction utilities for logs and diagnostics.
 *
 * We deny-list sensitive keys and mask their values. This is deliberately
 * conservative: anything that *looks* like a credential, personal document, CV
 * body, assessment answer, or raw IP is masked. See SECURITY.md §Logging.
 */
const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|secret|token|authorization|api[_-]?key|cookie|session|answer|cv|document|ssn|ci\b|carnet|ip\b|email|phone|telefono|consent|firstname|lastname|nombre|apellido|address|direccion)/i;

const MASK = '«redacted»';
const MAX_DEPTH = 6;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return MASK;
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? MASK : redact(val, depth + 1);
    }
    return out;
  }

  return value;
}

/** Mask an IP address to its network portion only (never log full IPs). */
export function coarseIp(ip: string): string {
  if (ip.includes(':')) return `${ip.split(':').slice(0, 2).join(':')}:…`; // IPv6
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return MASK;
}
