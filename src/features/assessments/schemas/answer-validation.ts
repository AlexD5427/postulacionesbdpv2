import type { AssessmentQuestion } from '@/shared/types/domain';

export type AnswerValue = string | string[] | number | boolean | null;

/** Whether a question has a non-empty answer. */
export function isAnswered(question: AssessmentQuestion, value: AnswerValue): boolean {
  switch (question.type) {
    case 'multiple_choice':
    case 'ranking':
      return Array.isArray(value) && value.length > 0;
    case 'numeric':
    case 'currency':
    case 'likert':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'true_false':
      return value === 'true' || value === 'false' || typeof value === 'boolean';
    case 'file_response':
    case 'media_response':
      return true; // disabled types are never required in the MVP
    default:
      return typeof value === 'string' && value.trim().length > 0;
  }
}

/**
 * Validate a single answer for UX. Returns a Spanish error string or undefined.
 * The server remains authoritative for real submissions.
 */
export function validateAnswer(question: AssessmentQuestion, value: AnswerValue): string | undefined {
  if (question.required && !isAnswered(question, value)) {
    return 'Esta pregunta es obligatoria.';
  }
  if ((question.type === 'numeric' || question.type === 'currency') && typeof value === 'number') {
    if (question.min !== undefined && value < question.min) return `El valor mínimo es ${question.min}.`;
    if (question.max !== undefined && value > question.max) return `El valor máximo es ${question.max}.`;
  }
  if ((question.type === 'short_text' || question.type === 'long_text') && typeof value === 'string') {
    if (question.maxLength && value.length > question.maxLength) {
      return `Máximo ${question.maxLength} caracteres.`;
    }
  }
  if (question.type === 'ranking' && Array.isArray(value)) {
    const expected = question.rankingItems?.length ?? 0;
    if (value.length !== expected) return 'Ordena todos los elementos.';
  }
  return undefined;
}

/** Ensure a serialized attempt never accidentally carries UI-only cruft. */
export function serializeAnswerValue(value: AnswerValue): AnswerValue {
  if (Array.isArray(value)) return [...value];
  return value;
}
