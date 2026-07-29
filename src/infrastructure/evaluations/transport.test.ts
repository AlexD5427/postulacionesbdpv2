import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EvaluationsError } from './contract';
import { readAction, writeAction } from './transport';

/**
 * Transport contract tests.
 *
 * These pin the three rules the Apps Script deployment imposes (redirect
 * following, `text/plain` writes, no automatic retry of writes) plus the
 * `requestId` discipline. They are the cheapest possible guard against the
 * class of production failure documented in the ATS repository
 * (`docs/evaluations/REPARACION_2026-07.md`).
 */

const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';

vi.mock('./endpoint', () => ({
  evaluationsEndpoint: () => ({ status: 'ready', url: ENDPOINT, diagnostic: '' }),
  isDemoMode: () => false,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function envelope(data: unknown, warnings: string[] = []) {
  return { ok: true, requestId: 'req_1', data, error: null, warnings };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Run a promise that awaits timers (the retry backoff) to completion. */
async function withTimers<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

describe('evaluations transport', () => {
  it('sends reads to the configured endpoint following redirects, as text/plain', async () => {
    fetchMock.mockResolvedValue(jsonResponse(envelope({ publicCode: 'EVL-1' })));

    await withTimers(readAction('getPublicAssessment', { publicCode: 'EVL-1' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    // Google answers 302; not following it means a 404 in production.
    expect(init.redirect).toBe('follow');
    // `application/json` would trigger a CORS preflight the deployment cannot answer.
    expect(init.headers['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(init.credentials).toBe('omit');
    expect(JSON.parse(init.body)).toEqual({
      action: 'getPublicAssessment',
      requestId: '',
      payload: { publicCode: 'EVL-1' },
    });
  });

  it('retries a transient transport failure on reads and keeps the payload intact', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse(envelope({ publicCode: 'EVL-1' })));

    const result = await withTimers(readAction('getPublicAssessment', { publicCode: 'EVL-1' }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ publicCode: 'EVL-1' });
  });

  it('does not retry a business error, because it is a valid answer', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: false,
        requestId: '',
        data: null,
        error: { code: 'NOT_FOUND', message: 'La evaluación no está disponible.', details: {} },
        warnings: [],
      }),
    );

    await expect(withTimers(readAction('getPublicAssessment', { publicCode: 'X' }))).rejects.toThrow(
      EvaluationsError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps every contract error code to safe candidate copy', async () => {
    const cases: Array<[string, string]> = [
      ['NOT_FOUND', 'Esta evaluación no está disponible.'],
      ['VALIDATION_ERROR', 'No se pudo validar el formulario. Revisa tus respuestas o contacta al equipo.'],
      ['CONFLICT', 'Esta evaluación ya fue enviada.'],
      ['LOCK_TIMEOUT', 'El servicio está ocupado. Inténtalo nuevamente en unos segundos.'],
      ['SCHEMA_ERROR', 'La evaluación no está disponible temporalmente.'],
      ['INTERNAL_ERROR', 'Ocurrió un error inesperado. Inténtalo nuevamente más tarde.'],
    ];

    for (const [code, message] of cases) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          requestId: 'req_1',
          data: null,
          // The backend message is intentionally different from what we render.
          error: { code, message: 'detalle interno del servidor', details: {} },
          warnings: [],
        }),
      );
      const error = await withTimers(
        writeAction('submitAttempt', 'req_1', {}).then(
          () => null,
          (e: unknown) => e,
        ),
      );
      expect(error).toBeInstanceOf(EvaluationsError);
      expect((error as EvaluationsError).code).toBe(code);
      expect((error as EvaluationsError).userMessage).toBe(message);
      // Internal detail never becomes user-facing copy.
      expect((error as EvaluationsError).userMessage).not.toContain('detalle interno');
    }
  });

  it('never retries a write automatically', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(withTimers(writeAction('submitAttempt', 'req_abc', {}))).rejects.toThrow(
      EvaluationsError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the caller requestId verbatim, so a manual retry cannot duplicate the attempt', async () => {
    fetchMock.mockResolvedValue(jsonResponse(envelope({ attemptId: 'att_1' })));

    await withTimers(writeAction('submitAttempt', 'req_same', { publicCode: 'EVL-1' }));
    await withTimers(writeAction('submitAttempt', 'req_same', { publicCode: 'EVL-1' }));

    const ids = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).requestId);
    expect(ids).toEqual(['req_same', 'req_same']);
  });

  it('rejects a write without a requestId instead of letting the backend do it', async () => {
    await expect(writeAction('submitAttempt', '', {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports the idempotent replay warning to the caller', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(envelope({ idempotentReplay: true, reference: 'att_1' }, ['IDEMPOTENT_REPLAY'])),
    );

    const result = await withTimers(writeAction('submitAttempt', 'req_1', {}));
    expect(result.idempotentReplay).toBe(true);
  });

  it('treats an unexpected body as an internal error rather than trusting it', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }));

    await expect(withTimers(writeAction('startAttempt', 'req_1', {}))).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
  });

  it('never sends cookies or an auth field to the public endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(envelope({ attemptId: 'att_1' })));

    await withTimers(
      writeAction('startAttempt', 'req_1', { publicCode: 'EVL-1', participant: { name: 'Ana' } }),
    );

    const init = fetchMock.mock.calls[0]![1];
    expect(init.credentials).toBe('omit');
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(['action', 'payload', 'requestId']);
    expect(body).not.toHaveProperty('auth');
  });
});
