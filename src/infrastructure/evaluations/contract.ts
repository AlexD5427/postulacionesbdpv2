import { z } from 'zod';

/**
 * Envelope contract of the ATS Evaluations Web App.
 *
 * Every response — success or failure — has exactly this shape:
 *
 *   { ok, requestId, data, error: { code, message, details } | null, warnings }
 *
 * Source of truth: `apps-script/evaluations/Response.gs` and
 * `docs/evaluations/API_CONTRACT.md` in the ATS repository. Nothing here is
 * assumed: the schema is tolerant on input (explicit defaults) and strict on
 * shape, so an unexpected body becomes a typed error instead of leaking into
 * the UI.
 */

export const EVALUATIONS_ERROR_CODES = [
  'BAD_REQUEST',
  'UNSUPPORTED_ACTION',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'FORBIDDEN',
  'SCHEMA_ERROR',
  'LOCK_TIMEOUT',
  'INTERNAL_ERROR',
  /** Client-side only: the network/transport failed before a body arrived. */
  'TRANSPORT_ERROR',
  /** Client-side only: the endpoint is not configured or points somewhere wrong. */
  'CONFIGURATION_ERROR',
] as const;

export type EvaluationsErrorCode = (typeof EVALUATIONS_ERROR_CODES)[number];

export const EVALUATIONS_WARNINGS = [
  'IDEMPOTENT_REPLAY',
  'INSECURE_ADMIN_MODE',
  'LEGACY_ANSWER_KEY_SOURCE',
] as const;

export type EvaluationsWarning = (typeof EVALUATIONS_WARNINGS)[number];

const errorSchema = z.object({
  code: z.string(),
  message: z.string().default(''),
  details: z.record(z.string(), z.unknown()).default({}),
});

export const envelopeSchema = z.object({
  ok: z.boolean(),
  requestId: z.string().default(''),
  data: z.unknown().nullable().default(null),
  error: errorSchema.nullable().default(null),
  warnings: z.array(z.string()).default([]),
});

export interface Envelope {
  ok: boolean;
  requestId: string;
  data: unknown;
  error: { code: EvaluationsErrorCode; message: string; details: Record<string, unknown> } | null;
  warnings: EvaluationsWarning[];
}

/**
 * Version of the Evaluations backend schema this client was written against.
 *
 * The envelope itself carries no version field; the backend exposes it through
 * `ping` (`data.schemaVersion`, see `Config.gs → EVAL_CONFIG.SCHEMA_VERSION`).
 * `pingEvaluations()` uses this constant to refuse a backend that is newer than
 * the client, mirroring what the jobs provider already does with
 * `SUPPORTED_APPS_SCRIPT_SCHEMA`.
 */
export const SUPPORTED_EVALUATIONS_SCHEMA = 1;

function normalizeCode(raw: string): EvaluationsErrorCode {
  return (EVALUATIONS_ERROR_CODES as readonly string[]).includes(raw)
    ? (raw as EvaluationsErrorCode)
    : 'INTERNAL_ERROR';
}

function normalizeWarnings(raw: string[]): EvaluationsWarning[] {
  return raw.filter((w): w is EvaluationsWarning =>
    (EVALUATIONS_WARNINGS as readonly string[]).includes(w),
  );
}

/**
 * Error raised by this client. `code` is the stable contract code; `userMessage`
 * is safe to render. Backend `message`/`details` are intentionally NOT surfaced
 * to the candidate: they may name internal entities.
 */
export class EvaluationsError extends Error {
  readonly code: EvaluationsErrorCode;
  readonly userMessage: string;

  constructor(code: EvaluationsErrorCode, options?: { message?: string; cause?: unknown }) {
    super(options?.message ?? code);
    this.name = 'EvaluationsError';
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/**
 * Candidate-facing copy for every contract code. Deliberately generic: the
 * candidate must not be able to tell a draft apart from a paused, closed or
 * non-existent assessment (ATS `PublicAssessmentService.gs`).
 */
const USER_MESSAGES: Record<EvaluationsErrorCode, string> = {
  NOT_FOUND: 'Esta evaluación no está disponible.',
  VALIDATION_ERROR:
    'No se pudo validar el formulario. Revisa tus respuestas o contacta al equipo.',
  CONFLICT: 'Esta evaluación ya fue enviada.',
  LOCK_TIMEOUT: 'El servicio está ocupado. Inténtalo nuevamente en unos segundos.',
  SCHEMA_ERROR: 'La evaluación no está disponible temporalmente.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. Inténtalo nuevamente más tarde.',
  BAD_REQUEST: 'No se pudo validar el formulario. Revisa tus respuestas o contacta al equipo.',
  UNSUPPORTED_ACTION: 'Ocurrió un error inesperado. Inténtalo nuevamente más tarde.',
  FORBIDDEN: 'Esta evaluación no está disponible.',
  TRANSPORT_ERROR:
    'No pudimos conectarnos con el servicio de evaluaciones. Revisa tu conexión e inténtalo de nuevo.',
  CONFIGURATION_ERROR: 'La evaluación no está disponible temporalmente.',
};

/** Candidate-facing message for a contract code. */
export function userMessageFor(code: EvaluationsErrorCode): string {
  return USER_MESSAGES[code];
}

/** Parse an unknown body into the envelope, or throw a typed transport error. */
export function parseEnvelope(raw: unknown): Envelope {
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EvaluationsError('INTERNAL_ERROR', {
      message: 'unexpected envelope shape',
      cause: parsed.error,
    });
  }
  const value = parsed.data;
  return {
    ok: value.ok,
    requestId: value.requestId,
    data: value.data ?? null,
    error: value.error
      ? {
          code: normalizeCode(value.error.code),
          message: value.error.message,
          details: value.error.details,
        }
      : null,
    warnings: normalizeWarnings(value.warnings),
  };
}

/** Did the backend replay an already-processed `requestId` instead of duplicating? */
export function isIdempotentReplay(envelope: Envelope): boolean {
  return envelope.warnings.includes('IDEMPOTENT_REPLAY');
}

/**
 * A fresh `requestId`.
 *
 * MUST be generated once per user intention and reused on every retry of that
 * same intention: a new id would create a second attempt (ATS
 * `Router.gs` + `ProcessedRequests`).
 */
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
