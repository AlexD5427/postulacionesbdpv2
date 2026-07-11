import type { JobFilters, JobPublication, JobSummary, Paginated, PageRequest } from '@/shared/types/domain';
import type { DataProvider, JobsRepository } from '@/core/data/repositories';
import { logger } from '@/core/observability/logger';
import { mergeJobSummaries } from './merge';

/**
 * Hybrid provider.
 *
 * Composes a primary (authoritative, e.g. Supabase — mock in the MVP) with a
 * secondary read source (Apps Script). For job reads it fans out to both,
 * normalises to the same domain model, and merges with deterministic conflict
 * resolution. If one source fails, valid results from the other are still
 * returned — failures are logged for developers only, never shown to
 * candidates. Candidate writes always target the primary provider.
 */
export function createHybridJobsRepository(
  primary: JobsRepository,
  secondary: JobsRepository | null,
): JobsRepository {
  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`hybrid: fuente "${label}" degradada`, {
        error: error instanceof Error ? error.name : 'unknown',
      });
      return fallback;
    }
  }

  return {
    async listJobs(filters: JobFilters, page: PageRequest): Promise<Paginated<JobSummary>> {
      // Fetch a wide window from both, merge, then paginate the merged set so
      // dedupe is stable across pages.
      const wide: PageRequest = { cursor: null, limit: 200 };
      const [primaryRes, secondaryRes] = await Promise.all([
        safe('primary', () => primary.listJobs(filters, wide), {
          items: [],
          nextCursor: null,
        } as Paginated<JobSummary>),
        secondary
          ? safe('secondary', () => secondary.listJobs(filters, wide), {
              items: [],
              nextCursor: null,
            } as Paginated<JobSummary>)
          : Promise.resolve({ items: [], nextCursor: null } as Paginated<JobSummary>),
      ]);

      const merged = mergeJobSummaries([
        { provider: 'supabase', items: primaryRes.items },
        { provider: 'google_sheets', items: secondaryRes.items },
      ]);

      const limit = page.limit ?? 9;
      const start = page.cursor ? Number.parseInt(page.cursor, 10) || 0 : 0;
      const slice = merged.slice(start, start + limit);
      const nextIndex = start + limit;
      return { items: slice, nextCursor: nextIndex < merged.length ? String(nextIndex) : null, totalHint: merged.length };
    },

    async getJob(id: string): Promise<JobPublication | null> {
      // Rich publications come from the authoritative source; fall back to the
      // secondary only if the primary has nothing.
      const primaryJob = await safe('primary', () => primary.getJob(id), null);
      if (primaryJob) return primaryJob;
      return secondary ? safe('secondary', () => secondary.getJob(id), null) : null;
    },

    async getFeatured(limit = 3): Promise<JobSummary[]> {
      const [a, b] = await Promise.all([
        safe('primary', () => primary.getFeatured(limit), [] as JobSummary[]),
        secondary ? safe('secondary', () => secondary.getFeatured(limit), [] as JobSummary[]) : Promise.resolve([]),
      ]);
      return mergeJobSummaries([
        { provider: 'supabase', items: a },
        { provider: 'google_sheets', items: b },
      ]).slice(0, limit);
    },

    async getFacets() {
      const [a, b] = await Promise.all([
        safe('primary', () => primary.getFacets(), { areas: [], cities: [] }),
        secondary ? safe('secondary', () => secondary.getFacets(), { areas: [], cities: [] }) : Promise.resolve({ areas: [], cities: [] }),
      ]);
      return {
        areas: [...new Set([...a.areas, ...b.areas])].sort(),
        cities: [...new Set([...a.cities, ...b.cities])].sort(),
      };
    },
  };
}

export function createHybridProvider(primary: DataProvider, secondary: DataProvider | null): DataProvider {
  return {
    ...primary,
    mode: 'hybrid',
    jobs: createHybridJobsRepository(primary.jobs, secondary?.jobs ?? null),
  };
}
