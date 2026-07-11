import type { ISODateString, ProviderMetadata } from './common';

/**
 * Schema-driven assessments. The runner renders whatever the ATS defines; it is
 * never hardcoded to a single test. Correct answers are NEVER present in any
 * candidate-facing payload.
 */
export type AssessmentQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_text'
  | 'long_text'
  | 'numeric'
  | 'currency'
  | 'date'
  | 'ranking'
  | 'likert'
  | 'scenario'
  | 'table_interpretation'
  | 'file_response'
  | 'media_response';

export interface AssessmentOption {
  id: string;
  label: string;
  /** Optional supporting text; never indicates correctness. */
  description?: string;
}

export interface AssessmentQuestion {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  helpText?: string;
  required: boolean;
  order: number;
  options?: AssessmentOption[];
  /** For likert. */
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  /** For ranking — items to order. */
  rankingItems?: AssessmentOption[];
  /** For table_interpretation — a small read-only data grid. */
  table?: { columns: string[]; rows: string[][] };
  /** Constraints for text/numeric. */
  maxLength?: number;
  min?: number;
  max?: number;
  currency?: 'BOB' | 'USD';
  /** For scenario — a narrative preceding the choice. */
  scenario?: string;
}

export interface AssessmentSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions: AssessmentQuestion[];
  /** Present questions in random order (display only, never affects scoring). */
  randomizeQuestions?: boolean;
}

export interface AssessmentDefinition {
  meta: ProviderMetadata;
  title: string;
  version: string;
  /** Shown before start; the standard non-clinical disclaimer. */
  instructions: string;
  disclaimer: string;
  estimatedMinutes: number;
  availableFrom?: ISODateString;
  availableUntil?: ISODateString | null;
  attemptPolicy: { maxAttempts: number; allowResume: boolean };
  timing: { mode: 'untimed' | 'total'; totalMinutes?: number };
  sections: AssessmentSection[];
  consentVersion: string;
  monitoringPolicyVersion: string;
  accessibility: {
    keyboardInstructions: string;
    accommodationsContact: string;
  };
  submissionPolicy: { requireAllRequired: boolean };
}

export interface AssessmentConsent {
  attemptId: string;
  consentVersion: string;
  assessmentVersion: string;
  acceptedInstructions: boolean;
  acceptedMonitoring: boolean;
  acceptedAt: ISODateString;
  locale: string;
  policyReference: string;
}

export interface AssessmentAnswer {
  questionId: string;
  /** Serialised value; shape depends on question type. */
  value: string | string[] | number | boolean | null;
  updatedAt: ISODateString;
}

export interface AssessmentAttempt {
  meta: ProviderMetadata;
  assessmentId: string;
  accountId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'expired';
  startedAt: ISODateString | null;
  submittedAt: ISODateString | null;
  currentSectionId?: string;
  answers: AssessmentAnswer[];
  consent?: AssessmentConsent;
  /** Server-issued deadline when timed. */
  deadlineAt?: ISODateString | null;
}

export interface AssessmentInvitation {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  jobId?: string;
  jobTitle?: string;
  invitedAt: ISODateString;
  expiresAt: ISODateString | null;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
}
