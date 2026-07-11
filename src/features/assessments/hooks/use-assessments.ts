'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssessmentAttempt } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

export function useAssessmentInvitations() {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.assessmentInvitations,
    queryFn: () => provider.assessments.listInvitations(),
  });
}

export function useAssessmentDefinition(id: string) {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.assessmentDefinition(id),
    queryFn: () => provider.assessments.getDefinition(id),
    enabled: Boolean(id),
  });
}

export function useAssessmentAttempt(id: string) {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.assessmentAttempt(id),
    queryFn: () => provider.assessments.getAttempt(id),
    enabled: Boolean(id),
  });
}

export function useStartAttempt() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: string) => provider.assessments.startAttempt(assessmentId),
    onSuccess: (attempt) => {
      queryClient.setQueryData(queryKeys.assessmentAttempt(attempt.assessmentId), attempt);
    },
  });
}

export function useSaveAttempt() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attempt: AssessmentAttempt) => provider.assessments.saveAttempt(attempt),
    onSuccess: (attempt) => {
      queryClient.setQueryData(queryKeys.assessmentAttempt(attempt.assessmentId), attempt);
    },
  });
}

export function useSubmitAttempt() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attempt: AssessmentAttempt) => provider.assessments.submitAttempt(attempt),
    onSuccess: (attempt) => {
      queryClient.setQueryData(queryKeys.assessmentAttempt(attempt.assessmentId), attempt);
      void queryClient.invalidateQueries({ queryKey: queryKeys.assessmentInvitations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
