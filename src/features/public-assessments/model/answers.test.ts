import { describe, expect, it } from 'vitest';
import type { PublicAssessment, PublicAssessmentQuestion } from '@/shared/types/domain';
import {
  defaultAnswerValue,
  isAnswered,
  missingRequired,
  skippedOptional,
  toAnswerInputs,
  validateAnswer,
  type AnswerMap,
} from './answers';

/**
 * Answer model tests.
 *
 * The wire format is the part of this module a mistake would be most expensive
 * in: a wrong shape means a `VALIDATION_ERROR` for a candidate who did nothing
 * wrong, and a stored answer nobody can grade.
 */

function question(overrides: Partial<PublicAssessmentQuestion>): PublicAssessmentQuestion {
  return {
    questionId: 'qst_1',
    questionType: 'q_short_text',
    control: 'text',
    collectsAnswer: true,
    position: 0,
    questionText: 'Pregunta',
    description: '',
    helpText: '',
    required: false,
    configuration: {},
    media: null,
    accessibility: { ariaLabel: '', longDescription: '' },
    options: [],
    ...overrides,
  };
}

function assessmentWith(questions: PublicAssessmentQuestion[]): PublicAssessment {
  return {
    publicCode: 'EVL-1',
    title: 'T',
    description: '',
    instructions: '',
    durationMinutes: null,
    versionLabel: 'v1.0',
    assessmentVersion: 1,
    questionCount: questions.length,
    theme: { accent: 'cyan', density: 'comfortable', showProgressBar: true },
    navigation: { mode: 'free', allowBack: true, showProgress: true },
    consent: { requireConsent: false, consentText: '', requireDataPrivacyAcceptance: true },
    sections: [
      {
        sectionId: 'sec_1',
        title: 'S',
        description: '',
        position: 0,
        timeLimitSeconds: null,
        questions,
      },
    ],
  };
}

const OPTIONS = [
  { optionId: 'opt_1', optionValue: 'a', optionText: 'A', mediaUrl: null },
  { optionId: 'opt_2', optionValue: 'b', optionText: 'B', mediaUrl: null },
  { optionId: 'opt_3', optionValue: 'c', optionText: 'C', mediaUrl: null },
];

describe('defaultAnswerValue', () => {
  it('seeds ordering with the author order and everything else empty', () => {
    expect(defaultAnswerValue(question({ control: 'ordering', options: OPTIONS }))).toEqual([
      'opt_1',
      'opt_2',
      'opt_3',
    ]);
    expect(defaultAnswerValue(question({ control: 'checkbox' }))).toEqual([]);
    expect(defaultAnswerValue(question({ control: 'number' }))).toBeNull();
    expect(defaultAnswerValue(question({ control: 'matrix' }))).toEqual({});
    expect(defaultAnswerValue(question({ control: 'text' }))).toBe('');
  });
});

describe('isAnswered', () => {
  it('does not count whitespace as an answer', () => {
    expect(isAnswered(question({ control: 'text' }), '   ')).toBe(false);
    expect(isAnswered(question({ control: 'text' }), 'algo')).toBe(true);
  });

  it('accepts zero as a numeric answer', () => {
    expect(isAnswered(question({ control: 'number' }), 0)).toBe(true);
    expect(isAnswered(question({ control: 'number' }), null)).toBe(false);
  });

  it('requires at least one selection for checkboxes', () => {
    expect(isAnswered(question({ control: 'checkbox', options: OPTIONS }), [])).toBe(false);
    expect(isAnswered(question({ control: 'checkbox', options: OPTIONS }), ['opt_1'])).toBe(true);
  });

  it('counts a complete ordering as answered', () => {
    const q = question({ control: 'ordering', options: OPTIONS });
    expect(isAnswered(q, ['opt_1', 'opt_2', 'opt_3'])).toBe(true);
    expect(isAnswered(q, ['opt_1'])).toBe(false);
  });

  it('treats non-answerable questions as satisfied so they never block a submission', () => {
    expect(isAnswered(question({ control: 'content', collectsAnswer: false }), null)).toBe(true);
    expect(isAnswered(question({ control: 'upload', collectsAnswer: false }), null)).toBe(true);
  });
});

describe('validateAnswer', () => {
  it('flags a missing required answer', () => {
    expect(validateAnswer(question({ required: true }), '')).toBe('Esta pregunta es obligatoria.');
  });

  it('applies numeric bounds from the public configuration', () => {
    const q = question({ control: 'number', configuration: { min: 0, max: 10 } });
    expect(validateAnswer(q, -1)).toBe('El valor mínimo es 0.');
    expect(validateAnswer(q, 11)).toBe('El valor máximo es 10.');
    expect(validateAnswer(q, 5)).toBeUndefined();
  });

  it('applies text length and selection bounds', () => {
    expect(validateAnswer(question({ configuration: { maxLength: 3 } }), 'abcd')).toBe(
      'Máximo 3 caracteres.',
    );
    expect(
      validateAnswer(
        question({ control: 'checkbox', options: OPTIONS, configuration: { maxSelections: 1 } }),
        ['opt_1', 'opt_2'],
      ),
    ).toBe('Puedes elegir como máximo 1 opciones.');
  });

  it('never validates a question the runner cannot answer', () => {
    expect(
      validateAnswer(question({ collectsAnswer: false, control: 'upload', required: true }), null),
    ).toBeUndefined();
  });
});

describe('toAnswerInputs', () => {
  it('builds exactly the wire shape the ATS documents, per control family', () => {
    const assessment = assessmentWith([
      question({ questionId: 'q_radio', control: 'radio', options: OPTIONS }),
      question({ questionId: 'q_select', control: 'select', options: OPTIONS }),
      question({ questionId: 'q_check', control: 'checkbox', options: OPTIONS }),
      question({ questionId: 'q_text', control: 'text' }),
      question({ questionId: 'q_area', control: 'textarea' }),
      question({ questionId: 'q_num', control: 'number' }),
      question({ questionId: 'q_date', control: 'date' }),
      question({ questionId: 'q_order', control: 'ordering', options: OPTIONS }),
      question({ questionId: 'q_matrix', control: 'matrix', configuration: { matrixRows: ['r1'] } }),
    ]);

    const answers: AnswerMap = {
      q_radio: 'opt_2',
      q_select: 'opt_1',
      q_check: ['opt_1', 'opt_3'],
      q_text: '  texto  ',
      q_area: 'párrafo',
      q_num: 42,
      q_date: '2026-08-01',
      q_order: ['opt_3', 'opt_1', 'opt_2'],
      q_matrix: { r1: 'c2' },
    };

    expect(toAnswerInputs(assessment, answers)).toEqual([
      { questionId: 'q_radio', selectedOptionId: 'opt_2' },
      { questionId: 'q_select', selectedOptionId: 'opt_1' },
      { questionId: 'q_check', selectedOptionIds: ['opt_1', 'opt_3'] },
      // Trimmed, never rewritten beyond that.
      { questionId: 'q_text', value: 'texto' },
      { questionId: 'q_area', value: 'párrafo' },
      { questionId: 'q_num', value: 42 },
      { questionId: 'q_date', value: '2026-08-01' },
      // Ordering is graded against `{ optionId: position }`, 1-based, as text.
      { questionId: 'q_order', value: { opt_3: '1', opt_1: '2', opt_2: '3' } },
      { questionId: 'q_matrix', value: { r1: 'c2' } },
    ]);
  });

  it('never sends grading fields, whatever the answer state contains', () => {
    const assessment = assessmentWith([question({ questionId: 'q1', control: 'radio', options: OPTIONS })]);
    const inputs = toAnswerInputs(assessment, { q1: 'opt_1' });
    const serialised = JSON.stringify(inputs);

    for (const forbidden of ['isCorrect', 'score', 'passed', 'pointsAwarded', 'maxPoints']) {
      expect(serialised).not.toContain(forbidden);
    }
    expect(Object.keys(inputs[0]!)).toEqual(['questionId', 'selectedOptionId']);
  });

  it('skips unanswered and non-answerable questions instead of sending empty values', () => {
    const assessment = assessmentWith([
      question({ questionId: 'q_empty', control: 'text' }),
      question({ questionId: 'q_block', control: 'content', collectsAnswer: false }),
      question({ questionId: 'q_upload', control: 'upload', collectsAnswer: false }),
      question({ questionId: 'q_ok', control: 'text' }),
    ]);

    const inputs = toAnswerInputs(assessment, { q_empty: '   ', q_ok: 'sí' });
    expect(inputs).toEqual([{ questionId: 'q_ok', value: 'sí' }]);
  });

  it('never repeats a questionId (the backend rejects duplicates)', () => {
    const assessment = assessmentWith([
      question({ questionId: 'q1', control: 'text' }),
      question({ questionId: 'q2', control: 'text' }),
    ]);
    const ids = toAnswerInputs(assessment, { q1: 'a', q2: 'b' }).map((a) => a.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('review summaries', () => {
  it('separates missing required from skipped optional questions', () => {
    const assessment = assessmentWith([
      question({ questionId: 'q_req', control: 'text', required: true }),
      question({ questionId: 'q_opt', control: 'text', required: false }),
      question({ questionId: 'q_done', control: 'text', required: true }),
    ]);
    const answers: AnswerMap = { q_done: 'listo' };

    expect(missingRequired(assessment, answers).map((q) => q.questionId)).toEqual(['q_req']);
    expect(skippedOptional(assessment, answers).map((q) => q.questionId)).toEqual(['q_opt']);
  });
});
