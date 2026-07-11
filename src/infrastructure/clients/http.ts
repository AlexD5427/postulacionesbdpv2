import { z } from 'zod';
import { AppError } from '@/core/errors/app-error';
import { logger } from '@/core/observability/logger';

/**
 * Hardened JSON fetch used by untrusted network boundaries (Apps Script,
 * future Archive API). Features:
 *  - request timeout via AbortController,
 *  - Zod response validation + schema-version awareness,
 *  - bounded retry with exponential backoff for SAFE idempotent reads only,
 *  - error normalisation (never leaks provider internals to the UI),
 *  - a tiny per-endpoint circuit breaker to avoid hammering a failing service.
 *
 * See HYBRID_SUPABASE_APPS_SCRIPT.md §Apps Script security expectations.
 */
export interface HttpJsonOptions<S extends z.ZodTypeAny> {
  url: string;
  schema: S;
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Only enable for idempotent GETs. */
  retry?: { attempts: number; baseDelayMs: number };
  signal?: AbortSignal;
}

interface BreakerState {
  failures: number;
  openedUntil: number;
}

const breakers = new Map<string, BreakerState>();
const BREAKER_THRESHOLD = 4;
const BREAKER_COOLDOWN_MS = 30_000;

function breakerKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

function isBreakerOpen(key: string): boolean {
  const state = breakers.get(key);
  if (!state) return false;
  if (state.openedUntil > Date.now()) return true;
  if (state.openedUntil !== 0 && state.openedUntil <= Date.now()) {
    breakers.set(key, { failures: 0, openedUntil: 0 });
  }
  return false;
}

function recordFailure(key: string): void {
  const state = breakers.get(key) ?? { failures: 0, openedUntil: 0 };
  state.failures += 1;
  if (state.failures >= BREAKER_THRESHOLD) {
    state.openedUntil = Date.now() + BREAKER_COOLDOWN_MS;
  }
  breakers.set(key, state);
}

function recordSuccess(key: string): void {
  breakers.set(key, { failures: 0, openedUntil: 0 });
}

async function once<S extends z.ZodTypeAny>(opts: HttpJsonOptions<S>): Promise<z.infer<S>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);

  // Chain an externally-provided signal if present.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(opts.url, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      // Never send cookies/credentials to third-party read endpoints.
      credentials: 'omit',
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) throw new AppError('not_found');
      if (response.status === 429) throw new AppError('rate_limited');
      if (response.status >= 500) throw new AppError('provider_unavailable');
      throw new AppError('unknown', { message: `HTTP ${response.status}` });
    }

    const json: unknown = await response.json();
    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      logger.warn('http: respuesta no válida según el esquema', {
        url: breakerKey(opts.url),
        issues: parsed.error.issues.length,
      });
      throw new AppError('provider_unavailable', {
        message: 'schema validation failed',
        cause: parsed.error,
      });
    }
    return parsed.data;
  } catch (error) {
    throw AppError.from(error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function httpJson<S extends z.ZodTypeAny>(
  opts: HttpJsonOptions<S>,
): Promise<z.infer<S>> {
  const key = breakerKey(opts.url);
  if (isBreakerOpen(key)) {
    throw new AppError('provider_unavailable', { message: 'circuit breaker open' });
  }

  const attempts = opts.retry?.attempts ?? 1;
  const baseDelay = opts.retry?.baseDelayMs ?? 300;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await once(opts);
      recordSuccess(key);
      return result as z.infer<S>;
    } catch (error) {
      lastError = error;
      const appError = AppError.from(error);
      // Only retry safe, transient failures.
      if (!appError.retryable || attempt === attempts - 1) break;
      const backoff = Math.min(baseDelay * 2 ** attempt, 4000);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  recordFailure(key);
  throw AppError.from(lastError);
}

/** Test-only: clear circuit-breaker state between tests. */
export function __resetBreakers(): void {
  breakers.clear();
}
