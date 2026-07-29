import type { ISODateString } from './common';

/**
 * Domain model of the **temporary public (beta) assessment module**.
 *
 * This is a deliberately separate model from `AssessmentDefinition` (the
 * authenticated engine): it mirrors exactly what the ATS public endpoint
 * `getPublicAssessment` returns — nothing more. See
 * `docs/PUBLIC_ASSESSMENTS_BETA.md` and, in the ATS repository,
 * `docs/evaluations/PORTAL_CANDIDATES_HANDOFF.md`.
 *
 * SECURITY: answer keys (`isCorrect`, `scoreValue`, `answerKey`, `feedback`,
 * `passingScore`, …) are neither modelled nor stored here. If the backend ever
 * sends one, the mapper drops it and a regression test fails.
 */

/**
 * Rendering family of a question. Mirrors `PluginControl` in the ATS registry
 * (`src/features/assessments/question-types/`) so the runner never has to know
 * about individual `questionType` identifiers.
 */
export type PublicQuestionControl =
  | 'content'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'ordering'
  | 'matrix'
  | 'upload'
  | 'pending'
  | 'unsupported';

export interface PublicAssessmentOption {
  optionId: string;
  optionValue: string;
  optionText: string;
  mediaUrl: string | null;
}

export interface PublicAssessmentQuestion {
  questionId: string;
  /** Raw ATS identifier (`q_single_choice`, `c_paragraph`, …). */
  questionType: string;
  /** Rendering family derived from `questionType`. */
  control: PublicQuestionControl;
  /** `false` for content blocks (`c_*`) and unknown types: they carry no answer. */
  collectsAnswer: boolean;
  position: number;
  questionText: string;
  description: string;
  helpText: string;
  required: boolean;
  /** Presentation-only allow-list forwarded by the backend. */
  configuration: PublicQuestionConfiguration;
  media: { kind: string; url: string; alt: string } | null;
  accessibility: { ariaLabel: string; longDescription: string };
  options: PublicAssessmentOption[];
}

/** Presentation keys the ATS whitelists in `Sanitize.gs` (`EVAL_PUBLIC_CONFIG_KEYS`). */
export interface PublicQuestionConfiguration {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleStep?: number;
  columns?: number;
  currency?: string;
  decimals?: number;
  allowMultiple?: boolean;
  maxSelections?: number;
  minSelections?: number;
  icon?: string;
  starCount?: number;
  labelMin?: string;
  labelMax?: string;
  matrixRows?: string[];
  matrixColumns?: string[];
}

export interface PublicAssessmentSection {
  sectionId: string;
  title: string;
  description: string;
  position: number;
  timeLimitSeconds: number | null;
  questions: PublicAssessmentQuestion[];
}

export interface PublicAssessment {
  publicCode: string;
  title: string;
  description: string;
  instructions: string;
  /** Total time limit in minutes, or `null` when the assessment is untimed. */
  durationMinutes: number | null;
  versionLabel: string;
  assessmentVersion: number;
  /** Number of answerable questions, as counted by the backend. */
  questionCount: number;
  theme: { accent: string; density: 'comfortable' | 'compact'; showProgressBar: boolean };
  navigation: { mode: 'free' | 'sequential' | 'one_by_one'; allowBack: boolean; showProgress: boolean };
  consent: { requireConsent: boolean; consentText: string; requireDataPrivacyAcceptance: boolean };
  sections: PublicAssessmentSection[];
}

/** Identity the candidate types in before starting. Never persisted in the URL. */
export interface PublicParticipant {
  name: string;
  document: string;
}

export interface PublicAttemptStart {
  attemptId: string;
  assessmentVersion: number;
  versionId: string;
  startedAt: ISODateString;
}

/**
 * Answer as sent to the backend. Exactly the shape of `PublicAnswerInput` in
 * the ATS handoff — no grading fields exist in this type by construction.
 */
export interface PublicAnswerInput {
  questionId: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  value?: string | number | Record<string, string> | null;
}

export interface PublicAttemptSubmission {
  publicCode: string;
  attemptId: string;
  participant: PublicParticipant;
  answers: PublicAnswerInput[];
  userAgent: string;
  durationSeconds: number;
}

export interface PublicAttemptReceipt {
  attemptId: string;
  status: string;
  gradingStatus: 'automatically_graded' | 'pending_manual_review' | 'fully_graded' | string;
  received: number;
  /** Only present when the assessment policy allows showing it to the candidate. */
  score?: number | null;
  passed?: boolean | null;
  /** `true` when the backend replayed an already-processed `requestId`. */
  idempotentReplay: boolean;
  /** Client-side reception timestamp, shown on the receipt. */
  receivedAt: ISODateString;
}
