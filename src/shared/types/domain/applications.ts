import type { ISODateString, ProviderMetadata } from './common';

/**
 * Job applications — candidate-facing view ONLY.
 *
 * Critical rule: the candidate never sees internal workflow state, ranking,
 * score or stage. The only "status" we expose is a neutral lifecycle flag
 * (draft/submitted/withdrawn) plus explicitly-published actions from the bank.
 */
export type ApplicationLifecycle = 'draft' | 'submitted' | 'withdrawn';

export interface ApplicationAnswer {
  questionId: string;
  value: string | string[] | number | boolean;
}

export interface CandidateActionRequest {
  id: string;
  /** Human-readable ask published explicitly by the bank. */
  label: string;
  description?: string;
  dueAt?: ISODateString | null;
  resolved: boolean;
  kind: 'document' | 'assessment' | 'interview' | 'information' | 'general';
  link?: string;
}

export interface CandidateVisibleMessage {
  id: string;
  subject: string;
  body: string;
  sentAt: ISODateString;
}

export interface JobApplication {
  meta: ProviderMetadata;
  accountId: string;
  jobId: string;
  jobReference: string;
  jobTitle: string;
  lifecycle: ApplicationLifecycle;
  cvId?: string;
  coverLetterId?: string;
  answers: ApplicationAnswer[];
  submittedAt: ISODateString | null;
  /** Confirmation number shown to the candidate after submit. */
  confirmationNumber?: string;
  /** Idempotency key to prevent duplicate submissions. */
  idempotencyKey?: string;
  assessmentInvitationId?: string;
  actionRequests: CandidateActionRequest[];
  messages: CandidateVisibleMessage[];
  withdrawable: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ApplicationSubmissionResult {
  applicationId: string;
  confirmationNumber: string;
  submittedAt: ISODateString;
  /** True when the server recognised an idempotent re-submit. */
  deduplicated: boolean;
}
