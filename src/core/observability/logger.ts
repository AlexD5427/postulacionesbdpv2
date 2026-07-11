import { env } from '@/core/config/env';
import { redact } from './redact';

/**
 * Structured, redacted, environment-aware logger.
 *
 * - Never logs sensitive fields (see redact.ts): passwords, tokens, CV content,
 *   assessment answers, documents, full IPs, consent text.
 * - In production, only `warn`/`error` are emitted (info/debug are dropped) so
 *   we never accidentally ship verbose PII-adjacent logs.
 * - Output is a single JSON line for easy ingestion; no third-party trackers.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minLevel(): number {
  if (env.NEXT_PUBLIC_APP_ENV === 'production') return LEVEL_WEIGHT.warn;
  if (env.NEXT_PUBLIC_APP_ENV === 'test') return LEVEL_WEIGHT.error;
  return LEVEL_WEIGHT.debug;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < minLevel()) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    scope: 'bdp-portal',
    message,
    ...(context ? { context: redact(context) } : {}),
  };

  const line = JSON.stringify(payload);
  /* eslint-disable no-console */
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  /* eslint-enable no-console */
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
