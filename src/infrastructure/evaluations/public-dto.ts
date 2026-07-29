import { z } from 'zod';

/**
 * Zod schemas for the four PUBLIC actions of the ATS Evaluations Web App.
 *
 * These mirror `src/features/assessments/api/dto.ts` in the ATS repository (the
 * executable contract shipped with `PORTAL_CANDIDATES_HANDOFF.md`). They are
 * tolerant on input — a missing optional field gets an explicit default — and
 * strict on shape, so a malformed response never reaches a component.
 *
 * SECURITY: the schemas are *closed* against grading data. Any key that could
 * reveal an answer key is enumerated in {@link FORBIDDEN_ASSESSMENT_KEYS} and
 * removed by {@link stripForbiddenKeys}. If one ever arrives it is treated as a
 * backend security defect: it is dropped, counted, and covered by a regression
 * test.
 */

/**
 * Keys that must NEVER be present in a candidate-facing payload.
 * Source: `apps-script/evaluations/Sanitize.gs` header + `API_CONTRACT.md`.
 */
export const FORBIDDEN_ASSESSMENT_KEYS = [
  'isCorrect',
  'is_correct',
  'correct',
  'correctAnswer',
  'correct_answer',
  'answerKey',
  'answer_key',
  'matchingKey',
  'matching_key',
  'expectedValue',
  'expected_value',
  'scoreValue',
  'score_value',
  'pointsAwarded',
  'points_awarded',
  'maxPoints',
  'max_points',
  'scoringMode',
  'scoring_mode',
  'passingScore',
  'passing_score',
  'feedback',
  'internalInstructions',
  'internal_instructions',
  'createdBy',
  'created_by',
  'updatedBy',
  'updated_by',
  'entityVersion',
  'entity_version',
  'rubrics',
  'rules',
  'tags',
  'assessmentId',
  'assessment_id',
] as const;

const FORBIDDEN_SET = new Set<string>(
  FORBIDDEN_ASSESSMENT_KEYS.map((key) => key.toLowerCase()),
);

export interface StripResult<T> {
  value: T;
  /** Forbidden keys actually found. Non-empty means a backend defect. */
  removed: string[];
}

/**
 * Recursively delete forbidden keys from a raw provider payload.
 *
 * `score` and `passed` are NOT in the deny-list because `submitAttempt` may
 * legitimately return them when the assessment policy allows the candidate to
 * see the result. They are handled by the submit schema instead, and the
 * receipt only renders them when the backend actually sent them.
 */
export function stripForbiddenKeys<T>(input: T): StripResult<T> {
  const removed: string[] = [];

  function walk(value: unknown, depth: number): unknown {
    if (depth > 12 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_SET.has(key.toLowerCase())) {
        removed.push(key);
        continue;
      }
      out[key] = walk(val, depth + 1);
    }
    return out;
  }

  return { value: walk(input, 0) as T, removed };
}

/* --------------------------------- Schemas -------------------------------- */

/** Presentation-only configuration allow-list (`EVAL_PUBLIC_CONFIG_KEYS`). */
export const publicConfigurationSchema = z
  .object({
    placeholder: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    rows: z.number().optional(),
    maxLength: z.number().optional(),
    minLength: z.number().optional(),
    scaleMin: z.number().optional(),
    scaleMax: z.number().optional(),
    scaleStep: z.number().optional(),
    columns: z.number().optional(),
    currency: z.string().optional(),
    decimals: z.number().optional(),
    allowMultiple: z.boolean().optional(),
    maxSelections: z.number().optional(),
    minSelections: z.number().optional(),
    icon: z.string().optional(),
    starCount: z.number().optional(),
    labelMin: z.string().optional(),
    labelMax: z.string().optional(),
    matrixRows: z.array(z.string()).optional(),
    matrixColumns: z.array(z.string()).optional(),
  })
  // Unknown presentation keys are dropped rather than rejected: the backend may
  // widen its allow-list before the portal is redeployed.
  .strip()
  .default({});

export const publicOptionSchema = z.object({
  optionId: z.string().min(1),
  optionValue: z.string().default(''),
  optionText: z.string().default(''),
  mediaUrl: z.string().nullable().default(null),
});

export const publicQuestionSchema = z.object({
  questionId: z.string().min(1),
  questionType: z.string().min(1),
  position: z.number().default(0),
  questionText: z.string().default(''),
  description: z.string().default(''),
  helpText: z.string().default(''),
  required: z.boolean().default(false),
  configuration: publicConfigurationSchema,
  media: z
    .object({ kind: z.string().default('image'), url: z.string(), alt: z.string().default('') })
    .nullable()
    .default(null),
  accessibility: z
    .object({ ariaLabel: z.string().default(''), longDescription: z.string().default('') })
    .default({ ariaLabel: '', longDescription: '' }),
  options: z.array(publicOptionSchema).default([]),
});

export type PublicQuestionDTO = z.infer<typeof publicQuestionSchema>;

export const publicSectionSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().default(''),
  description: z.string().default(''),
  position: z.number().default(0),
  timeLimitSeconds: z.number().nullable().default(null),
  questions: z.array(publicQuestionSchema).default([]),
});

export type PublicSectionDTO = z.infer<typeof publicSectionSchema>;

export const publicAssessmentSchema = z.object({
  publicCode: z.string().min(1),
  title: z.string().default(''),
  description: z.string().default(''),
  instructions: z.string().default(''),
  durationMinutes: z.number().nullable().default(null),
  versionLabel: z.string().default(''),
  assessmentVersion: z.number().default(1),
  questionCount: z.number().default(0),
  theme: z
    .object({
      accent: z.string().default('cyan'),
      density: z.enum(['comfortable', 'compact']).default('comfortable'),
      showProgressBar: z.boolean().default(true),
    })
    .default({ accent: 'cyan', density: 'comfortable', showProgressBar: true }),
  navigation: z
    .object({
      mode: z.enum(['free', 'sequential', 'one_by_one']).default('free'),
      allowBack: z.boolean().default(true),
      showProgress: z.boolean().default(true),
    })
    .default({ mode: 'free', allowBack: true, showProgress: true }),
  consent: z
    .object({
      requireConsent: z.boolean().default(false),
      consentText: z.string().default(''),
      requireDataPrivacyAcceptance: z.boolean().default(true),
    })
    .default({ requireConsent: false, consentText: '', requireDataPrivacyAcceptance: true }),
  sections: z.array(publicSectionSchema).default([]),
});

export type PublicAssessmentDTO = z.infer<typeof publicAssessmentSchema>;

export const startAttemptSchema = z.object({
  attemptId: z.string().min(1),
  assessmentVersion: z.number().default(1),
  versionId: z.string().default(''),
  startedAt: z.string().default(''),
});

export type StartAttemptDTO = z.infer<typeof startAttemptSchema>;

export const submitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  status: z.string().default('submitted'),
  gradingStatus: z.string().default('automatically_graded'),
  received: z.number().default(0),
  /** Only sent when `policies.resultVisibility.candidate` allows it. */
  score: z.number().nullable().optional(),
  passed: z.boolean().nullable().optional(),
});

export type SubmitAttemptDTO = z.infer<typeof submitAttemptSchema>;

/**
 * Body returned when the backend recognises an already-processed `requestId`.
 *
 * IMPORTANT (verified in `apps-script/evaluations/RequestService.gs →
 * evalWithWriteLock_`): a replay does **not** re-run the action, so `data` is
 * NOT the action's own payload. It is this envelope of references instead, and
 * `warnings` contains `IDEMPOTENT_REPLAY`. A client that only knows the happy
 * shape would treat a legitimate retry as a malformed response — which is
 * exactly the path a candidate hits after a flaky network.
 */
export const idempotentReplaySchema = z.object({
  idempotentReplay: z.literal(true),
  reference: z.string().default(''),
  processedAt: z.string().default(''),
  summary: z
    .object({
      attemptId: z.string().optional(),
      gradingStatus: z.string().optional(),
    })
    .default({}),
});

export type IdempotentReplayDTO = z.infer<typeof idempotentReplaySchema>;

export const pingSchema = z.object({
  service: z.string().default(''),
  schemaVersion: z.number().default(1),
  serverTime: z.string().default(''),
});
