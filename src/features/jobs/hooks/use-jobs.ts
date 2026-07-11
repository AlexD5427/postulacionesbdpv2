'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { JobFilters } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

const PAGE_SIZE = 9;

/** Infinite/cursor-paginated jobs listing driven by the active provider. */
export function useJobsInfinite(filters: JobFilters) {
  const provider = getDataProvider();
  return useInfiniteQuery({
    queryKey: queryKeys.jobs(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => provider.jobs.listJobs(filters, { cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useJobFacets() {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.jobFacets,
    queryFn: () => provider.jobs.getFacets(),
    staleTime: 5 * 60_000,
  });
}

export function useJob(id: string) {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => provider.jobs.getJob(id),
  });
}
