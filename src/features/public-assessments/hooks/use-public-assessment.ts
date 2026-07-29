'use client';

import { useMutation } from '@tanstack/react-query';
import type { PublicAssessmentsRepository } from '@/core/data/public-assessments';
import type { PublicAttemptSubmission, PublicParticipant } from '@/shared/types/domain';
import { getPublicAssessmentsRepository } from '@/infrastructure/evaluations/factory';

/**
 * Application hooks for the public assessment module.
 *
 * Components never touch `fetch` or the Apps Script client: they call these
 * mutations, which delegate to the repository port. The repository can be
 * injected, which is what the component tests use instead of stubbing `fetch`.
 *
 * Every write takes an explicit `requestId` created by the caller. That is the
 * whole idempotency story: the hook must never invent one, or a retry would
 * silently become a second attempt.
 */

export function usePublicAssessmentsRepository(
  override?: PublicAssessmentsRepository,
): PublicAssessmentsRepository {
  return override ?? getPublicAssessmentsRepository();
}

/** Look up a published assessment by its public code. Idempotent read. */
export function useAssessmentLookup(repository: PublicAssessmentsRepository) {
  return useMutation({
    mutationFn: (publicCode: string) => repository.getAssessment(publicCode),
  });
}

/** Open the attempt, anchoring it to the published version. */
export function useStartPublicAttempt(repository: PublicAssessmentsRepository) {
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      publicCode: string;
      participant: PublicParticipant;
      userAgent: string;
    }) =>
      repository.startAttempt(input.requestId, {
        publicCode: input.publicCode,
        participant: input.participant,
        userAgent: input.userAgent,
      }),
  });
}

/**
 * Submit the attempt. `retry: 0` is deliberate: TanStack Query must never repeat
 * a write on its own. Retrying is a decision of the candidate, and the UI hands
 * back the SAME `requestId` when they take it.
 */
export function useSubmitPublicAttempt(repository: PublicAssessmentsRepository) {
  return useMutation({
    retry: 0,
    mutationFn: (input: { requestId: string; submission: PublicAttemptSubmission }) =>
      repository.submitAttempt(input.requestId, input.submission),
  });
}
