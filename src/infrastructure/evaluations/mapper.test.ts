import { describe, expect, it } from 'vitest';
import { EvaluationsError } from './contract';
import { mapAttemptReceipt, mapAttemptStart, mapPublicAssessment } from './mapper';
import { FORBIDDEN_ASSESSMENT_KEYS, stripForbiddenKeys } from './public-dto';
import { controlForQuestionType, knownQuestionTypes } from './question-controls';

/**
 * Security and contract tests for the provider → domain boundary.
 *
 * The most important one is the first: even if the backend regressed and leaked
 * an answer key, nothing that reaches the UI may contain it.
 */

function assessmentDto(overrides: Record<string, unknown> = {}) {
  return {
    publicCode: 'EVL-TEST-0001',
    title: 'Evaluación de prueba',
    description: '',
    instructions: 'Lee con calma.',
    durationMinutes: 20,
    versionLabel: 'v1.0',
    assessmentVersion: 2,
    questionCount: 1,
    theme: { accent: 'cyan', density: 'comfortable', showProgressBar: true },
    navigation: { mode: 'free', allowBack: true, showProgress: true },
    consent: { requireConsent: false, consentText: '', requireDataPrivacyAcceptance: true },
    sections: [
      {
        sectionId: 'sec_1',
        title: 'Sección',
        description: '',
        position: 0,
        timeLimitSeconds: null,
        questions: [
          {
            questionId: 'qst_1',
            questionType: 'q_single_choice',
            position: 0,
            questionText: '¿Cuál?',
            description: '',
            helpText: '',
            required: true,
            configuration: { maxLength: 10 },
            media: null,
            accessibility: { ariaLabel: '', longDescription: '' },
            options: [
              { optionId: 'opt_1', optionValue: 'a', optionText: 'A', mediaUrl: null },
              { optionId: 'opt_2', optionValue: 'b', optionText: 'B', mediaUrl: null },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('stripForbiddenKeys', () => {
  it('removes every forbidden key, at any depth, and reports what it found', () => {
    const payload = {
      title: 'x',
      passingScore: 70,
      sections: [
        {
          questions: [
            {
              questionId: 'q1',
              scoringMode: 'exact',
              maxPoints: 3,
              feedback: { correct: 'bien' },
              options: [{ optionId: 'o1', isCorrect: true, scoreValue: 1, matchingKey: '2' }],
            },
          ],
        },
      ],
    };

    const { value, removed } = stripForbiddenKeys(payload);
    const serialised = JSON.stringify(value);

    for (const key of FORBIDDEN_ASSESSMENT_KEYS) {
      expect(serialised).not.toContain(`"${key}"`);
    }
    expect(removed).toContain('isCorrect');
    expect(removed).toContain('passingScore');
    expect(value).toEqual({
      title: 'x',
      sections: [{ questions: [{ questionId: 'q1', options: [{ optionId: 'o1' }] }] }],
    });
  });

  it('keeps score and passed, which submitAttempt may legitimately return', () => {
    const { value } = stripForbiddenKeys({ score: 80, passed: true });
    expect(value).toEqual({ score: 80, passed: true });
  });
});

describe('mapPublicAssessment', () => {
  it('maps the DTO and derives a control family per question', () => {
    const assessment = mapPublicAssessment(assessmentDto());

    expect(assessment.publicCode).toBe('EVL-TEST-0001');
    expect(assessment.assessmentVersion).toBe(2);
    const question = assessment.sections[0]!.questions[0]!;
    expect(question.control).toBe('radio');
    expect(question.collectsAnswer).toBe(true);
    expect(question.options).toHaveLength(2);
  });

  it('drops leaked answer keys instead of rendering them', () => {
    const leaky = assessmentDto();
    // Simulate a backend regression.
    (leaky.sections[0]!.questions[0] as Record<string, unknown>).scoringMode = 'exact';
    (leaky.sections[0]!.questions[0]!.options[0] as Record<string, unknown>).isCorrect = true;
    (leaky as Record<string, unknown>).passingScore = 70;

    const assessment = mapPublicAssessment(leaky);
    const serialised = JSON.stringify(assessment);

    expect(serialised).not.toContain('isCorrect');
    expect(serialised).not.toContain('scoringMode');
    expect(serialised).not.toContain('passingScore');
  });

  it('orders sections and questions by position, ignoring array order', () => {
    const dto = assessmentDto({
      sections: [
        {
          sectionId: 'sec_b',
          title: 'B',
          description: '',
          position: 1,
          timeLimitSeconds: null,
          questions: [],
        },
        {
          sectionId: 'sec_a',
          title: 'A',
          description: '',
          position: 0,
          timeLimitSeconds: null,
          questions: [
            {
              questionId: 'q2',
              questionType: 'q_short_text',
              position: 1,
              questionText: 'segunda',
              description: '',
              helpText: '',
              required: false,
              configuration: {},
              media: null,
              accessibility: { ariaLabel: '', longDescription: '' },
              options: [],
            },
            {
              questionId: 'q1',
              questionType: 'q_short_text',
              position: 0,
              questionText: 'primera',
              description: '',
              helpText: '',
              required: false,
              configuration: {},
              media: null,
              accessibility: { ariaLabel: '', longDescription: '' },
              options: [],
            },
          ],
        },
      ],
    });

    const assessment = mapPublicAssessment(dto);
    expect(assessment.sections.map((s) => s.sectionId)).toEqual(['sec_a', 'sec_b']);
    expect(assessment.sections[0]!.questions.map((q) => q.questionId)).toEqual(['q1', 'q2']);
  });

  it('treats an unknown question type as unsupported instead of guessing', () => {
    const dto = assessmentDto();
    dto.sections[0]!.questions[0]!.questionType = 'q_something_new_2030';

    const question = mapPublicAssessment(dto).sections[0]!.questions[0]!;
    expect(question.control).toBe('unsupported');
    expect(question.collectsAnswer).toBe(false);
  });

  it('normalises a non-positive duration to "untimed" so no fake countdown appears', () => {
    expect(mapPublicAssessment(assessmentDto({ durationMinutes: 0 })).durationMinutes).toBeNull();
    expect(mapPublicAssessment(assessmentDto({ durationMinutes: null })).durationMinutes).toBeNull();
  });

  it('rejects a malformed DTO with a safe error', () => {
    expect(() => mapPublicAssessment({ nope: true })).toThrow(EvaluationsError);
    try {
      mapPublicAssessment({ nope: true });
    } catch (error) {
      expect((error as EvaluationsError).code).toBe('SCHEMA_ERROR');
      expect((error as EvaluationsError).userMessage).toBe(
        'La evaluación no está disponible temporalmente.',
      );
    }
  });
});

describe('mapAttemptStart', () => {
  it('maps the normal payload', () => {
    const start = mapAttemptStart({
      attemptId: 'att_1',
      assessmentVersion: 3,
      versionId: 'ver_1',
      startedAt: '2026-07-01T10:00:00.000Z',
    });
    expect(start).toEqual({
      attemptId: 'att_1',
      assessmentVersion: 3,
      versionId: 'ver_1',
      startedAt: '2026-07-01T10:00:00.000Z',
    });
  });

  it('recovers the attempt id from an idempotent replay envelope', () => {
    // Shape produced by `RequestService.gs → evalReplaySummary_`: the action is
    // NOT re-run, so `data` is a reference envelope, not the action payload.
    const start = mapAttemptStart(
      {
        idempotentReplay: true,
        reference: 'att_replayed',
        processedAt: '2026-07-01T10:00:00.000Z',
        summary: { attemptId: 'att_replayed' },
      },
      4,
    );
    expect(start.attemptId).toBe('att_replayed');
    expect(start.assessmentVersion).toBe(4);
  });
});

describe('mapAttemptReceipt', () => {
  it('maps a pending manual review without inventing a score', () => {
    const receipt = mapAttemptReceipt(
      { attemptId: 'att_1', status: 'submitted', gradingStatus: 'pending_manual_review', received: 5 },
      false,
    );
    expect(receipt.gradingStatus).toBe('pending_manual_review');
    expect(receipt.score).toBeUndefined();
    expect(receipt.passed).toBeUndefined();
  });

  it('keeps a null score as null (never zero)', () => {
    const receipt = mapAttemptReceipt(
      {
        attemptId: 'att_1',
        status: 'submitted',
        gradingStatus: 'pending_manual_review',
        received: 5,
        score: null,
        passed: null,
      },
      false,
    );
    expect(receipt.score).toBeNull();
    expect(receipt.passed).toBeNull();
  });

  it('accepts an idempotent replay as a successful reception', () => {
    const receipt = mapAttemptReceipt(
      {
        idempotentReplay: true,
        reference: 'att_1',
        processedAt: '2026-07-01T10:00:00.000Z',
        summary: { attemptId: 'att_1', gradingStatus: 'pending_manual_review' },
      },
      true,
    );
    expect(receipt.attemptId).toBe('att_1');
    expect(receipt.idempotentReplay).toBe(true);
    expect(receipt.status).toBe('submitted');
  });
});

describe('question control registry', () => {
  it('mirrors the ATS control families for the documented types', () => {
    expect(controlForQuestionType('q_single_choice')).toBe('radio');
    expect(controlForQuestionType('q_true_false')).toBe('radio');
    expect(controlForQuestionType('q_likert')).toBe('radio');
    expect(controlForQuestionType('q_multiple_choice')).toBe('checkbox');
    expect(controlForQuestionType('q_multiselect')).toBe('checkbox');
    expect(controlForQuestionType('q_dropdown')).toBe('select');
    expect(controlForQuestionType('q_short_text')).toBe('text');
    expect(controlForQuestionType('q_long_text')).toBe('textarea');
    expect(controlForQuestionType('q_scenario')).toBe('textarea');
    expect(controlForQuestionType('q_chart_interpretation')).toBe('textarea');
    expect(controlForQuestionType('q_currency')).toBe('number');
    expect(controlForQuestionType('q_date')).toBe('date');
    expect(controlForQuestionType('q_ranking')).toBe('ordering');
    expect(controlForQuestionType('q_matrix')).toBe('matrix');
    expect(controlForQuestionType('q_file_response')).toBe('upload');
    expect(controlForQuestionType('q_hotspot')).toBe('pending');
    expect(controlForQuestionType('c_paragraph')).toBe('content');
  });

  it('covers every type the ATS declares (54 registry entries)', () => {
    expect(knownQuestionTypes()).toHaveLength(54);
  });
});
