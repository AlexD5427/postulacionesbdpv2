import { describe, expect, it } from 'vitest';
import { isAnswered, validateAnswer } from './answer-validation';
import type { AssessmentQuestion } from '@/shared/types/domain';

function q(partial: Partial<AssessmentQuestion> & { type: AssessmentQuestion['type'] }): AssessmentQuestion {
  return { id: 'q', prompt: 'P', required: true, order: 1, ...partial };
}

describe('isAnswered', () => {
  it('handles text answers', () => {
    expect(isAnswered(q({ type: 'short_text' }), '')).toBe(false);
    expect(isAnswered(q({ type: 'short_text' }), '  ')).toBe(false);
    expect(isAnswered(q({ type: 'short_text' }), 'hola')).toBe(true);
  });
  it('handles numeric answers', () => {
    expect(isAnswered(q({ type: 'numeric' }), null)).toBe(false);
    expect(isAnswered(q({ type: 'numeric' }), 0)).toBe(true);
  });
  it('handles multiple choice + ranking arrays', () => {
    expect(isAnswered(q({ type: 'multiple_choice' }), [])).toBe(false);
    expect(isAnswered(q({ type: 'multiple_choice' }), ['a'])).toBe(true);
  });
  it('treats disabled types as answered (never required)', () => {
    expect(isAnswered(q({ type: 'file_response' }), null)).toBe(true);
  });
});

describe('validateAnswer', () => {
  it('flags required empty answers', () => {
    expect(validateAnswer(q({ type: 'short_text' }), '')).toBeTruthy();
    expect(validateAnswer(q({ type: 'short_text', required: false }), '')).toBeUndefined();
  });
  it('enforces numeric min/max', () => {
    expect(validateAnswer(q({ type: 'numeric', min: 0, max: 10 }), 20)).toContain('máximo');
    expect(validateAnswer(q({ type: 'numeric', min: 5 }), 1)).toContain('mínimo');
    expect(validateAnswer(q({ type: 'numeric', min: 0, max: 10 }), 5)).toBeUndefined();
  });
  it('enforces text maxLength', () => {
    expect(validateAnswer(q({ type: 'short_text', maxLength: 3 }), 'abcd')).toContain('Máximo');
  });
  it('requires all ranking items ordered', () => {
    const question = q({ type: 'ranking', rankingItems: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] });
    expect(validateAnswer(question, ['a'])).toBeTruthy();
    expect(validateAnswer(question, ['a', 'b'])).toBeUndefined();
  });
});
