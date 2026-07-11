import { describe, expect, it } from 'vitest';
import { mergeJobSummaries } from './merge';
import type { JobSummary } from '@/shared/types/domain';

function summary(partial: Partial<JobSummary> & { reference: string; sourceProvider: JobSummary['sourceProvider'] }): JobSummary {
  return {
    id: partial.id ?? `${partial.sourceProvider}:${partial.reference}`,
    reference: partial.reference,
    title: partial.title ?? 'Título',
    area: 'Área',
    city: 'La Paz',
    workMode: 'on_site',
    employmentType: 'full_time',
    experienceLevel: 'mid',
    shortDescription: 'desc',
    publishedAt: partial.publishedAt ?? '2026-01-01T00:00:00.000Z',
    closesAt: null,
    featured: false,
    sourceProvider: partial.sourceProvider,
  };
}

describe('mergeJobSummaries', () => {
  it('deduplicates by reference, preferring the authoritative provider (supabase > sheets)', () => {
    const merged = mergeJobSummaries([
      { provider: 'google_sheets', items: [summary({ reference: 'BDP-1', title: 'Desde Sheets', sourceProvider: 'google_sheets' })] },
      { provider: 'supabase', items: [summary({ reference: 'BDP-1', title: 'Desde Supabase', sourceProvider: 'supabase' })] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Desde Supabase');
  });

  it('keeps distinct references from both providers', () => {
    const merged = mergeJobSummaries([
      { provider: 'supabase', items: [summary({ reference: 'BDP-1', sourceProvider: 'supabase' })] },
      { provider: 'google_sheets', items: [summary({ reference: 'BDP-2', sourceProvider: 'google_sheets' })] },
    ]);
    expect(merged.map((j) => j.reference).sort()).toEqual(['BDP-1', 'BDP-2']);
  });

  it('breaks ties within the same provider by most recent publishedAt', () => {
    const merged = mergeJobSummaries([
      {
        provider: 'google_sheets',
        items: [
          summary({ reference: 'BDP-1', title: 'Vieja', sourceProvider: 'google_sheets', publishedAt: '2026-01-01T00:00:00.000Z' }),
          summary({ reference: 'BDP-1', title: 'Nueva', sourceProvider: 'google_sheets', publishedAt: '2026-02-01T00:00:00.000Z' }),
        ],
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Nueva');
  });

  it('sorts the merged result by publishedAt descending', () => {
    const merged = mergeJobSummaries([
      {
        provider: 'supabase',
        items: [
          summary({ reference: 'A', sourceProvider: 'supabase', publishedAt: '2026-01-01T00:00:00.000Z' }),
          summary({ reference: 'B', sourceProvider: 'supabase', publishedAt: '2026-03-01T00:00:00.000Z' }),
        ],
      },
    ]);
    expect(merged.map((j) => j.reference)).toEqual(['B', 'A']);
  });
});
