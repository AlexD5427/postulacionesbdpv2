'use client';

import { useMemo, useState } from 'react';
import { SlidersHorizontal, SearchX, AlertTriangle } from 'lucide-react';
import type { JobFilters } from '@/shared/types/domain';
import { useJobsInfinite, useJobFacets } from '../hooks/use-jobs';
import { JobCard } from './JobCard';
import { JobCardSkeleton } from './JobCardSkeleton';
import { JobFiltersPanel } from './JobFiltersPanel';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/design-system/primitives/Dialog';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

function countActive(filters: JobFilters): number {
  return [filters.area, filters.city, filters.workMode, filters.employmentType, filters.experienceLevel].filter(
    Boolean,
  ).length;
}

export function JobsDirectory() {
  const [filters, setFilters] = useState<JobFilters>({ sort: 'recent' });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);

  const effectiveFilters = useMemo<JobFilters>(
    () => ({ ...filters, query: debouncedSearch.trim() || undefined }),
    [filters, debouncedSearch],
  );

  const { data: facets } = useJobFacets();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useJobsInfinite(effectiveFilters);

  const jobs = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.totalHint ?? jobs.length;
  const activeCount = countActive(filters);

  function patchFilters(patch: Partial<JobFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }
  function clearFilters() {
    setFilters({ sort: filters.sort });
    setSearch('');
  }

  const filtersPanel = (
    <JobFiltersPanel
      filters={filters}
      facets={facets}
      activeCount={activeCount}
      onChange={patchFilters}
      onClear={clearFilters}
      searchValue={search}
      onSearchChange={setSearch}
    />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      {/* Desktop filters */}
      <aside className="hidden lg:block" aria-label="Filtros de convocatorias">
        <GlassSurface variant="subtle" radius="2xl" padding="md" className="sticky top-24">
          {filtersPanel}
        </GlassSurface>
      </aside>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? 'Buscando convocatorias…' : `${total} convocatoria${total === 1 ? '' : 's'} disponible${total === 1 ? '' : 's'}`}
          </p>

          {/* Mobile filter sheet */}
          <div className="lg:hidden">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
                </Button>
              </DialogTrigger>
              <DialogContent side="right">
                <DialogTitle className="mb-4 text-xl font-semibold">Filtros</DialogTitle>
                {filtersPanel}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isError ? (
          <GlassSurface variant="standard" radius="2xl" padding="lg" className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-warning" aria-hidden />
            <h2 className="text-lg font-semibold">No pudimos cargar las convocatorias</h2>
            <p className="text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </GlassSurface>
        ) : isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <GlassSurface variant="standard" radius="2xl" padding="lg" className="flex flex-col items-center gap-3 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
            <h2 className="text-lg font-semibold">No encontramos convocatorias</h2>
            <p className="text-muted-foreground">Prueba ajustando o limpiando los filtros.</p>
            {activeCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </GlassSurface>
        ) : (
          <>
            <ul className="grid list-none gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <li key={job.id} className="h-full">
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
                  Cargar más convocatorias
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
