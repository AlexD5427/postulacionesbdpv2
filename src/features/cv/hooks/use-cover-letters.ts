'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoverLetter } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

export function useCoverLetters() {
  const provider = getDataProvider();
  return useQuery({ queryKey: queryKeys.coverLetters, queryFn: () => provider.coverLetters.list() });
}

export function useCreateCoverLetter() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (letter: Omit<CoverLetter, 'meta' | 'updatedAt'>) => provider.coverLetters.create(letter),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coverLetters }),
  });
}

export function useUpdateCoverLetter() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CoverLetter> }) =>
      provider.coverLetters.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coverLetters }),
  });
}

export function useDeleteCoverLetter() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.coverLetters.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coverLetters }),
  });
}

export function useDuplicateCoverLetter() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.coverLetters.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coverLetters }),
  });
}
