'use client';

import { Search, X } from 'lucide-react';
import type { JobFilters } from '@/shared/types/domain';
import { Input } from '@/design-system/primitives/Input';
import { Select } from '@/design-system/primitives/Select';
import { Button } from '@/design-system/primitives/Button';
import { Label } from '@/design-system/primitives/Label';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  SORT_LABELS,
  WORK_MODE_LABELS,
} from '../lib/labels';

/**
 * Job directory filter controls. Fully keyboard accessible; each control has a
 * visible label. No hidden/hover-only interactions.
 */
export function JobFiltersPanel({
  filters,
  facets,
  activeCount,
  onChange,
  onClear,
  searchValue,
  onSearchChange,
}: {
  filters: JobFilters;
  facets: { areas: string[]; cities: string[] } | undefined;
  activeCount: number;
  onChange: (patch: Partial<JobFilters>) => void;
  onClear: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}) {
  const areaOptions = (facets?.areas ?? []).map((a) => ({ value: a, label: a }));
  const cityOptions = (facets?.cities ?? []).map((c) => ({ value: c, label: c }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job-search">Buscar</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="job-search"
            type="search"
            placeholder="Cargo, área, palabra clave…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-area">Área</Label>
          <Select
            id="filter-area"
            placeholder="Todas las áreas"
            options={areaOptions}
            value={filters.area ?? ''}
            onChange={(e) => onChange({ area: e.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-city">Ciudad</Label>
          <Select
            id="filter-city"
            placeholder="Todas las ciudades"
            options={cityOptions}
            value={filters.city ?? ''}
            onChange={(e) => onChange({ city: e.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-mode">Modalidad</Label>
          <Select
            id="filter-mode"
            placeholder="Todas"
            options={Object.entries(WORK_MODE_LABELS).map(([value, label]) => ({ value, label }))}
            value={filters.workMode ?? ''}
            onChange={(e) => onChange({ workMode: (e.target.value || undefined) as JobFilters['workMode'] })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-type">Tipo de contrato</Label>
          <Select
            id="filter-type"
            placeholder="Todos"
            options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            value={filters.employmentType ?? ''}
            onChange={(e) => onChange({ employmentType: (e.target.value || undefined) as JobFilters['employmentType'] })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-level">Nivel de experiencia</Label>
          <Select
            id="filter-level"
            placeholder="Todos"
            options={Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => ({ value, label }))}
            value={filters.experienceLevel ?? ''}
            onChange={(e) => onChange({ experienceLevel: (e.target.value || undefined) as JobFilters['experienceLevel'] })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-sort">Ordenar por</Label>
          <Select
            id="filter-sort"
            options={Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }))}
            value={filters.sort ?? 'recent'}
            onChange={(e) => onChange({ sort: e.target.value as JobFilters['sort'] })}
          />
        </div>
      </div>

      {activeCount > 0 && (
        <Button variant="outline" size="sm" onClick={onClear} className="w-full">
          <X className="h-4 w-4" aria-hidden />
          Limpiar filtros ({activeCount})
        </Button>
      )}
    </div>
  );
}
