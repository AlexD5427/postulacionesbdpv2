import type { PublicAssessmentsRepository } from '@/core/data/public-assessments';
import { logger } from '@/core/observability/logger';
import { mapAttemptReceipt, mapAttemptStart, mapPublicAssessment } from './mapper';
import { readAction, writeAction } from './transport';
import { EvaluationsError, SUPPORTED_EVALUATIONS_SCHEMA } from './contract';
import { pingSchema } from './public-dto';

/**
 * Apps Script adapter for the four public Evaluations actions.
 *
 * This is the only place in the portal that knows the action names and the
 * exact payload shapes. The payloads are built key by key — never by spreading
 * a UI object — so no accidental field (least of all a grading field) can travel
 * to the backend.
 */

const MAX_USER_AGENT = 300; // `EVAL_CONFIG.LIMITS.MAX_USER_AGENT`

/** Normalise the public code the way the backend does before comparing. */
function normalizeCode(publicCode: string): string {
  return publicCode.trim().toUpperCase();
}

function truncateUserAgent(userAgent: string): string {
  return userAgent.slice(0, MAX_USER_AGENT);
}

export function createAppsScriptPublicAssessmentsRepository(): PublicAssessmentsRepository {
  return {
    live: true,

    async getAssessment(publicCode, signal) {
      const code = normalizeCode(publicCode);
      if (!code) throw new EvaluationsError('NOT_FOUND', { message: 'empty public code' });
      const result = await readAction('getPublicAssessment', { publicCode: code }, { signal });
      return mapPublicAssessment(result.data);
    },

    async startAttempt(requestId, input, signal) {
      const result = await writeAction(
        'startAttempt',
        requestId,
        {
          publicCode: normalizeCode(input.publicCode),
          participant: {
            name: input.participant.name,
            document: input.participant.document,
          },
          userAgent: truncateUserAgent(input.userAgent),
        },
        { signal },
      );
      return mapAttemptStart(result.data);
    },

    async submitAttempt(requestId, submission, signal) {
      const result = await writeAction(
        'submitAttempt',
        requestId,
        {
          publicCode: normalizeCode(submission.publicCode),
          attemptId: submission.attemptId,
          participant: {
            name: submission.participant.name,
            document: submission.participant.document,
          },
          // Built by `toAnswerInputs()`; grading keys do not exist in that type.
          answers: submission.answers,
          userAgent: truncateUserAgent(submission.userAgent),
          durationSeconds: submission.durationSeconds,
        },
        { signal },
      );
      return mapAttemptReceipt(result.data, result.idempotentReplay);
    },
  };
}

/**
 * Diagnostic ping. Not used by the candidate flow — it exists so an operator can
 * verify a deployment (and the schema version) from the browser console or a
 * smoke test without touching an administrative action.
 */
export async function pingEvaluations(signal?: AbortSignal): Promise<{ schemaVersion: number }> {
  const result = await readAction('ping', {}, { signal });
  const parsed = pingSchema.safeParse(result.data);
  if (!parsed.success) throw new EvaluationsError('INTERNAL_ERROR', { message: 'invalid ping' });
  if (parsed.data.schemaVersion > SUPPORTED_EVALUATIONS_SCHEMA) {
    logger.warn('evaluations: versión de esquema no soportada', {
      got: parsed.data.schemaVersion,
      supported: SUPPORTED_EVALUATIONS_SCHEMA,
    });
    throw new EvaluationsError('SCHEMA_ERROR', { message: 'unsupported schema version' });
  }
  return { schemaVersion: parsed.data.schemaVersion };
}
