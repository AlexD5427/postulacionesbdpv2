'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JobApplication } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

export function useApplications() {
  const provider = getDataProvider();
  return useQuery({ queryKey: queryKeys.applications, queryFn: () => provider.applications.list() });
}

export function useApplication(id: string) {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => provider.applications.get(id),
    enabled: Boolean(id),
  });
}

export function useSaveDraft() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (application: JobApplication) => provider.applications.saveDraft(application),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
  });
}

export function useSubmitApplication() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ application, idempotencyKey }: { application: JobApplication; idempotencyKey: string }) =>
      provider.applications.submit(application, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useWithdrawApplication() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.applications.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
  });
}
