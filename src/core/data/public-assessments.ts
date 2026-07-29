import type {
  PublicAssessment,
  PublicAttemptReceipt,
  PublicAttemptStart,
  PublicAttemptSubmission,
  PublicParticipant,
} from '@/shared/types/domain';

/**
 * Port for the **temporary public assessment module** (beta, no login).
 *
 * It is deliberately NOT part of `DataProvider`: that aggregate is the
 * candidate-account surface, every provider implements all of it, and this
 * module is meant to be removable in one commit once the authenticated
 * evaluation flow ships. Components never call `fetch`; they consume hooks that
 * consume this port (see docs/DATA_PROVIDER_ARCHITECTURE.md).
 *
 * `requestId` is an explicit parameter of both writes: idempotency belongs to
 * the caller's intention, not to the adapter. Reusing the same id is what stops
 * a retry from creating a second attempt.
 */
export interface PublicAssessmentsRepository {
  /** Whether this adapter talks to the real backend (`false` = local demo data). */
  readonly live: boolean;
  getAssessment(publicCode: string, signal?: AbortSignal): Promise<PublicAssessment>;
  startAttempt(
    requestId: string,
    input: { publicCode: string; participant: PublicParticipant; userAgent: string },
    signal?: AbortSignal,
  ): Promise<PublicAttemptStart>;
  submitAttempt(
    requestId: string,
    submission: PublicAttemptSubmission,
    signal?: AbortSignal,
  ): Promise<PublicAttemptReceipt>;
}
