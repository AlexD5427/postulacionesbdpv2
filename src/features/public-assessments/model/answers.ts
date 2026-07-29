import type {
  PublicAnswerInput,
  PublicAssessment,
  PublicAssessmentQuestion,
} from '@/shared/types/domain';

/**
 * Answer state of the public runner, and its translation to the wire format.
 *
 * Two invariants hold by construction:
 *
 *  1. **No grading data exists in this module.** {@link PublicAnswerInput} has no
 *     `isCorrect`, `score`, `passed` or `pointsAwarded` field, so the client
 *     cannot send one even by accident. The server is the only authority.
 *  2. **One shape per control family**, matching the ATS answer contract
 *     (`PORTAL_CANDIDATES_HANDOFF.md §4`). Anything the runner cannot answer
 *     (content blocks, uploads, pending editors, unknown types) is skipped
 *     entirely rather than sent as an empty value.
 */
export type PublicAnswerValue =
  /** radio · select · text · textarea · date · time · datetime */
  | string
  /** checkbox (selected option ids) · ordering (ordered option ids) */
  | string[]
  /** number */
  | number
  /** matrix (`{ row: column }`) */
  | Record<string, string>
  | null;

export type AnswerMap = Record<string, PublicAnswerValue>;

/** All questions of the assessment, in author order, flattened across sections. */
export function flattenQuestions(assessment: PublicAssessment): PublicAssessmentQuestion[] {
  return assessment.sections.flatMap((section) => section.questions);
}

/** Questions that actually collect an answer (excludes content blocks etc.). */
export function answerableQuestions(assessment: PublicAssessment): PublicAssessmentQuestion[] {
  return flattenQuestions(assessment).filter((question) => question.collectsAnswer);
}

/**
 * Default value for a question. `ordering` starts at the author's order so the
 * candidate can accept it as-is; every other control starts empty.
 */
export function defaultAnswerValue(question: PublicAssessmentQuestion): PublicAnswerValue {
  if (question.control === 'ordering') return question.options.map((option) => option.optionId);
  if (question.control === 'checkbox') return [];
  if (question.control === 'matrix') return {};
  if (question.control === 'number') return null;
  return '';
}

/** Is there a real answer for this question? */
export function isAnswered(
  question: PublicAssessmentQuestion,
  value: PublicAnswerValue,
): boolean {
  if (!question.collectsAnswer) return true;
  switch (question.control) {
    case 'checkbox':
      return Array.isArray(value) && value.length > 0;
    case 'ordering':
      // The author's order is a valid answer, so an ordering question counts as
      // answered as soon as every item is present.
      return Array.isArray(value) && value.length === question.options.length && value.length > 0;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'matrix': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const rows = question.configuration.matrixRows ?? [];
      const filled = Object.values(value).filter((cell) => cell !== '').length;
      return rows.length > 0 ? filled === rows.length : filled > 0;
    }
    default:
      return typeof value === 'string' && value.trim().length > 0;
  }
}

/**
 * UX validation for one answer. Returns Spanish copy or `undefined`.
 * The server re-validates: this only prevents avoidable round trips.
 */
export function validateAnswer(
  question: PublicAssessmentQuestion,
  value: PublicAnswerValue,
): string | undefined {
  if (!question.collectsAnswer) return undefined;

  if (question.required && !isAnswered(question, value)) {
    return 'Esta pregunta es obligatoria.';
  }

  const config = question.configuration;

  if (question.control === 'number' && typeof value === 'number') {
    if (config.min !== undefined && value < config.min) return `El valor mínimo es ${config.min}.`;
    if (config.max !== undefined && value > config.max) return `El valor máximo es ${config.max}.`;
  }

  if ((question.control === 'text' || question.control === 'textarea') && typeof value === 'string') {
    if (config.maxLength !== undefined && value.length > config.maxLength) {
      return `Máximo ${config.maxLength} caracteres.`;
    }
    if (
      config.minLength !== undefined &&
      value.trim().length > 0 &&
      value.trim().length < config.minLength
    ) {
      return `Mínimo ${config.minLength} caracteres.`;
    }
  }

  if (question.control === 'checkbox' && Array.isArray(value)) {
    if (config.maxSelections !== undefined && value.length > config.maxSelections) {
      return `Puedes elegir como máximo ${config.maxSelections} opciones.`;
    }
    if (
      config.minSelections !== undefined &&
      value.length > 0 &&
      value.length < config.minSelections
    ) {
      return `Elige al menos ${config.minSelections} opciones.`;
    }
  }

  return undefined;
}

/** Required questions that are still unanswered, in author order. */
export function missingRequired(
  assessment: PublicAssessment,
  answers: AnswerMap,
): PublicAssessmentQuestion[] {
  return answerableQuestions(assessment).filter(
    (question) => question.required && !isAnswered(question, answers[question.questionId] ?? null),
  );
}

/** Optional questions left blank, so the review step can show them separately. */
export function skippedOptional(
  assessment: PublicAssessment,
  answers: AnswerMap,
): PublicAssessmentQuestion[] {
  return answerableQuestions(assessment).filter(
    (question) => !question.required && !isAnswered(question, answers[question.questionId] ?? null),
  );
}

/** All UX validation errors, keyed by question id. */
export function validateAll(assessment: PublicAssessment, answers: AnswerMap): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const question of answerableQuestions(assessment)) {
    const error = validateAnswer(question, answers[question.questionId] ?? null);
    if (error) errors[question.questionId] = error;
  }
  return errors;
}

/**
 * Translate the runner state into the exact wire format.
 *
 * Only answered, answerable questions are included. `ordering` becomes the map
 * the backend grades against (`{ optionId: position }`, 1-based, as text) —
 * see `ScoringService.gs → evalGradeStructured_`.
 */
export function toAnswerInputs(assessment: PublicAssessment, answers: AnswerMap): PublicAnswerInput[] {
  const inputs: PublicAnswerInput[] = [];

  for (const question of answerableQuestions(assessment)) {
    const value = answers[question.questionId] ?? null;
    if (!isAnswered(question, value)) continue;

    switch (question.control) {
      case 'radio':
      case 'select':
        if (typeof value === 'string') {
          inputs.push({ questionId: question.questionId, selectedOptionId: value });
        }
        break;

      case 'checkbox':
        if (Array.isArray(value)) {
          inputs.push({ questionId: question.questionId, selectedOptionIds: [...value] });
        }
        break;

      case 'ordering':
        if (Array.isArray(value)) {
          const positions: Record<string, string> = {};
          value.forEach((optionId, index) => {
            positions[optionId] = String(index + 1);
          });
          inputs.push({ questionId: question.questionId, value: positions });
        }
        break;

      case 'number':
        if (typeof value === 'number') {
          inputs.push({ questionId: question.questionId, value });
        }
        break;

      case 'matrix':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          inputs.push({ questionId: question.questionId, value: { ...value } });
        }
        break;

      default:
        if (typeof value === 'string') {
          inputs.push({ questionId: question.questionId, value: value.trim() });
        }
        break;
    }
  }

  return inputs;
}
