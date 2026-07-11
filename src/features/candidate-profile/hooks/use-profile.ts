'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CandidateProfile } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

export function useAccount() {
  const provider = getDataProvider();
  return useQuery({ queryKey: queryKeys.account, queryFn: () => provider.candidate.getAccount() });
}

export function useProfile() {
  const provider = getDataProvider();
  return useQuery({ queryKey: queryKeys.profile, queryFn: () => provider.candidate.getProfile() });
}

export function useUpdateProfile() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CandidateProfile>) => provider.candidate.updateProfile(patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
    },
  });
}

export function useRequestAccountDeletion() {
  const provider = getDataProvider();
  return useMutation({ mutationFn: () => provider.candidate.requestAccountDeletion() });
}

export function useRequestDataExport() {
  const provider = getDataProvider();
  return useMutation({ mutationFn: () => provider.candidate.requestDataExport() });
}
