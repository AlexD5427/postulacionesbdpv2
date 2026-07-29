import { logger } from '@/core/observability/logger';
import {
  EvaluationsError,
  isIdempotentReplay,
  parseEnvelope,
  type Envelope,
} from './contract';
import { evaluationsEndpoint } from './endpoint';

/**
 * HTTP transport for the public Evaluations actions.
 *
 * Three rules come straight from the backend and cannot be relaxed
 * (`docs/evaluations/API_CONTRACT.md §Transporte`):
 *
 *  1. `redirect: 'follow'` on every request. Google answers `302`; without
 *     following it the app fails with `404` in production.
 *  2. `POST` bodies use `Content-Type: text/plain;charset=utf-8`. The default
 *     Apps Script deployment cannot answer the CORS preflight that
 *     `application/json` would trigger.
 *  3. Reads (idempotent) may retry with backoff. **Writes never retry
 *     automatically**; the caller keeps the same `requestId` and decides.
 *
 * Nothing about the participant is ever logged: `logger` only receives the
 * action name and a coarse outcome.
 */

const TIMEOUT_MS = 15_000;
const READ_RETRIES = 2;
const RETRY_BACKOFF_MS = [600, 1200];

export interface TransportOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface TransportResult {
  data: unknown;
  idempotentReplay: boolean;
  warnings: Envelope['warnings'];
}

interface RequestBody {
  action: string;
  requestId: string;
  payload: Record<string, unknown>;
}

function withTimeout(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

function resolveUrl(): string {
  const endpoint = evaluationsEndpoint();
  if (endpoint.status !== 'ready') {
    logger.error('evaluations: endpoint mal configurado', { diagnostic: endpoint.diagnostic });
    throw new EvaluationsError('CONFIGURATION_ERROR', { message: endpoint.diagnostic });
  }
  return endpoint.url;
}

/** One round trip. Throws {@link EvaluationsError} on transport failures. */
async function post(body: RequestBody, options: TransportOptions): Promise<Envelope> {
  const url = resolveUrl();
  const { signal, cleanup } = withTimeout(options.signal, options.timeoutMs ?? TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      // Rule 1 — Apps Script answers 302 and the body lives behind the redirect.
      redirect: 'follow',
      // Rule 2 — avoids the CORS preflight the deployment cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      // Third-party endpoint: never attach cookies.
      credentials: 'omit',
      cache: 'no-store',
      signal,
    });
    if (!response.ok) {
      throw new EvaluationsError('TRANSPORT_ERROR', { message: `HTTP ${response.status}` });
    }
    return parseEnvelope(await response.json());
  } catch (error) {
    if (error instanceof EvaluationsError) throw error;
    throw new EvaluationsError('TRANSPORT_ERROR', {
      message: 'fetch failed',
      cause: error,
    });
  } finally {
    cleanup();
  }
}

function toResult(action: string, envelope: Envelope): TransportResult {
  if (!envelope.ok) {
    const code = envelope.error?.code ?? 'INTERNAL_ERROR';
    // The backend message can name internal entities, so it is logged (already
    // redacted by `logger`) but never rendered.
    logger.warn('evaluations: acción rechazada', { action, code });
    throw new EvaluationsError(code, { message: envelope.error?.message });
  }
  if (envelope.warnings.includes('LEGACY_ANSWER_KEY_SOURCE')) {
    logger.warn('evaluations: la versión anclada no tiene snapshot', { action });
  }
  return {
    data: envelope.data,
    idempotentReplay: isIdempotentReplay(envelope),
    warnings: envelope.warnings,
  };
}

/**
 * Idempotent read. Retries transient transport failures with the backoff the
 * contract prescribes; a business error is a valid answer and is never retried.
 *
 * Reads carry an empty `requestId`: the backend only consumes ids for writes.
 */
export async function readAction(
  action: string,
  payload: Record<string, unknown> = {},
  options: TransportOptions = {},
): Promise<TransportResult> {
  let lastError: EvaluationsError = new EvaluationsError('TRANSPORT_ERROR');
  for (let attempt = 0; attempt <= READ_RETRIES; attempt += 1) {
    try {
      return toResult(action, await post({ action, requestId: '', payload }, options));
    } catch (error) {
      if (!(error instanceof EvaluationsError)) throw error;
      // Only the transport is retried. CONFIGURATION_ERROR and business codes
      // are terminal.
      if (error.code !== 'TRANSPORT_ERROR') throw error;
      lastError = error;
      if (options.signal?.aborted) break;
      const delay = RETRY_BACKOFF_MS[attempt];
      if (attempt < READ_RETRIES && delay !== undefined) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Write. **Never** retried here.
 *
 * `requestId` is mandatory and belongs to the caller: it must be created once
 * per user intention and reused verbatim on every manual retry, otherwise the
 * backend would create a second attempt.
 */
export async function writeAction(
  action: string,
  requestId: string,
  payload: Record<string, unknown> = {},
  options: TransportOptions = {},
): Promise<TransportResult> {
  if (!requestId) {
    throw new EvaluationsError('BAD_REQUEST', { message: 'missing requestId for write action' });
  }
  return toResult(action, await post({ action, requestId, payload }, options));
}
