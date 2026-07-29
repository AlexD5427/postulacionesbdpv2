import type {
  PublicAssessment,
  PublicAssessmentQuestion,
  PublicAssessmentSection,
  PublicAttemptReceipt,
  PublicAttemptStart,
} from '@/shared/types/domain';
import { logger } from '@/core/observability/logger';
import { controlCollectsAnswer, controlForQuestionType } from './question-controls';
import {
  idempotentReplaySchema,
  publicAssessmentSchema,
  startAttemptSchema,
  stripForbiddenKeys,
  submitAttemptSchema,
  type PublicQuestionDTO,
  type PublicSectionDTO,
} from './public-dto';
import { EvaluationsError } from './contract';

/**
 * Provider → domain mappers.
 *
 * Every response crosses two gates before it becomes a domain object:
 *
 *  1. {@link stripForbiddenKeys} deletes anything that could reveal an answer
 *     key. Defence in depth: the backend already sanitises (`Sanitize.gs`), but
 *     the portal must not depend on that being bug-free.
 *  2. The Zod schema validates the shape. A malformed body becomes a typed
 *     error, never a half-rendered screen.
 */

function mapQuestion(question: PublicQuestionDTO): PublicAssessmentQuestion {
  const control = controlForQuestionType(question.questionType);
  return {
    questionId: question.questionId,
    questionType: question.questionType,
    control,
    collectsAnswer: controlCollectsAnswer(control),
    position: question.position,
    questionText: question.questionText,
    description: question.description,
    helpText: question.helpText,
    required: question.required,
    configuration: question.configuration,
    media: question.media,
    accessibility: question.accessibility,
    options: question.options,
  };
}

function mapSection(raw: PublicSectionDTO): PublicAssessmentSection {
  return {
    sectionId: raw.sectionId,
    title: raw.title,
    description: raw.description,
    position: raw.position,
    timeLimitSeconds: raw.timeLimitSeconds,
    questions: [...raw.questions].sort((a, b) => a.position - b.position).map(mapQuestion),
  };
}

/** `getPublicAssessment` → domain. */
export function mapPublicAssessment(raw: unknown): PublicAssessment {
  const { value, removed } = stripForbiddenKeys(raw);
  if (removed.length > 0) {
    // A leak here is a backend security defect. We drop the data, record the
    // key names (never the values) and keep going: the candidate must not see a
    // technical error, and an answer key must not reach the browser's memory.
    logger.error('evaluations: el DTO público incluyó campos prohibidos', {
      keys: [...new Set(removed)],
    });
  }

  const parsed = publicAssessmentSchema.safeParse(value);
  if (!parsed.success) {
    logger.warn('evaluations: DTO público inválido', { issues: parsed.error.issues.length });
    throw new EvaluationsError('SCHEMA_ERROR', { message: 'invalid public assessment dto' });
  }

  const dto = parsed.data;
  return {
    publicCode: dto.publicCode,
    title: dto.title,
    description: dto.description,
    instructions: dto.instructions,
    durationMinutes:
      dto.durationMinutes !== null && dto.durationMinutes > 0 ? dto.durationMinutes : null,
    versionLabel: dto.versionLabel,
    assessmentVersion: dto.assessmentVersion,
    questionCount: dto.questionCount,
    theme: dto.theme,
    navigation: dto.navigation,
    consent: dto.consent,
    sections: [...dto.sections].sort((a, b) => a.position - b.position).map(mapSection),
  };
}

/**
 * `startAttempt` → domain.
 *
 * Handles both shapes: the action's own payload and the idempotent-replay
 * envelope returned when the same `requestId` is sent twice (see
 * `idempotentReplaySchema`). Recovering the `attemptId` from a replay is what
 * lets a candidate retry a failed start without opening a second attempt.
 */
export function mapAttemptStart(raw: unknown, fallbackVersion = 1): PublicAttemptStart {
  const clean = stripForbiddenKeys(raw).value;

  const replay = idempotentReplaySchema.safeParse(clean);
  if (replay.success) {
    const attemptId = replay.data.summary.attemptId ?? replay.data.reference;
    if (!attemptId) {
      throw new EvaluationsError('INTERNAL_ERROR', { message: 'replay without attempt reference' });
    }
    return {
      attemptId,
      assessmentVersion: fallbackVersion,
      versionId: '',
      startedAt: replay.data.processedAt || new Date().toISOString(),
    };
  }

  const parsed = startAttemptSchema.safeParse(clean);
  if (!parsed.success) {
    throw new EvaluationsError('INTERNAL_ERROR', { message: 'invalid startAttempt dto' });
  }
  return {
    attemptId: parsed.data.attemptId,
    assessmentVersion: parsed.data.assessmentVersion,
    versionId: parsed.data.versionId,
    startedAt: parsed.data.startedAt || new Date().toISOString(),
  };
}

/**
 * `submitAttempt` → domain receipt.
 *
 * Also accepts the idempotent-replay envelope: a retry that the backend already
 * processed is a **success** for the candidate ("we have your answers"), not an
 * error, and it must not be presented as a second submission.
 */
export function mapAttemptReceipt(raw: unknown, idempotentReplay: boolean): PublicAttemptReceipt {
  const clean = stripForbiddenKeys(raw).value;

  const replay = idempotentReplaySchema.safeParse(clean);
  if (replay.success) {
    const attemptId = replay.data.summary.attemptId ?? replay.data.reference;
    return {
      attemptId,
      status: 'submitted',
      // The replay envelope may not carry it; we never invent a grading state.
      gradingStatus: replay.data.summary.gradingStatus ?? '',
      received: 0,
      idempotentReplay: true,
      receivedAt: replay.data.processedAt || new Date().toISOString(),
    };
  }

  const parsed = submitAttemptSchema.safeParse(clean);
  if (!parsed.success) {
    throw new EvaluationsError('INTERNAL_ERROR', { message: 'invalid submitAttempt dto' });
  }
  const dto = parsed.data;
  const receipt: PublicAttemptReceipt = {
    attemptId: dto.attemptId,
    status: dto.status,
    gradingStatus: dto.gradingStatus,
    received: dto.received,
    idempotentReplay,
    receivedAt: new Date().toISOString(),
  };
  // `score`/`passed` are only present when the assessment policy allows the
  // candidate to see them. When grading is pending the backend sends `null`;
  // the receipt must then say "under review", never "0".
  if (dto.score !== undefined) receipt.score = dto.score;
  if (dto.passed !== undefined) receipt.passed = dto.passed;
  return receipt;
}
