'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DigitalCV } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

export function useCV() {
  const provider = getDataProvider();
  return useQuery({ queryKey: queryKeys.cv, queryFn: () => provider.cv.getCV() });
}

export function useSaveCV() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cv: DigitalCV) => provider.cv.saveCV(cv),
    onSuccess: (cv) => {
      queryClient.setQueryData(queryKeys.cv, cv);
    },
  });
}
