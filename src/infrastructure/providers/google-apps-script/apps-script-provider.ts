import type { JobFilters, JobPublication, JobSummary, Paginated, PageRequest } from '@/shared/types/domain';
import type { DataProvider, JobsRepository } from '@/core/data/repositories';
import { AppError } from '@/core/errors/app-error';
import { logger } from '@/core/observability/logger';
import { httpJson } from '@/infrastructure/clients/http';
import { createMockProvider } from '../mock/mock-provider';
import { appsScriptResponseSchema, SUPPORTED_APPS_SCRIPT_SCHEMA } from './schema';
import { mapAppsScriptJobToSummary } from './mapper';

/**
 * Google Apps Script provider.
 *
 * Only PUBLIC JOB READS are served here — candidate writes must never touch a
 * spreadsheet from the browser (see §8.1). Candidate-scoped repositories are
 * delegated to the mock provider so the app stays usable while a real backend
 * is wired up. In production this mode should sit behind a server proxy.
 */
export function createAppsScriptJobsRepository(publicReadUrl: string): JobsRepository {
  async function fetchSummaries(): Promise<JobSummary[]> {
    if (!publicReadUrl) throw new AppError('provider_unavailable', { message: 'missing apps-script url' });
    const data = await httpJson({
      url: publicReadUrl,
      schema: appsScriptResponseSchema,
      timeoutMs: 8000,
      retry: { attempts: 3, baseDelayMs: 300 },
    });
    if (data.schemaVersion > SUPPORTED_APPS_SCRIPT_SCHEMA) {
      logger.warn('apps-script: versión de esquema no soportada', { got: data.schemaVersion });
      throw new AppError('provider_unavailable', { message: 'unsupported schema version' });
    }
    return data.jobs
      .map(mapAppsScriptJobToSummary)
      .filter((job) => job.title.length > 0);
  }

  function applyFilters(items: JobSummary[], filters: JobFilters): JobSummary[] {
    const q = filters.query?.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter((j) =>
        [j.title, j.area, j.city, j.shortDescription, j.reference].join(' ').toLowerCase().includes(q),
      );
    }
    if (filters.area) list = list.filter((j) => j.area === filters.area);
    if (filters.city) list = list.filter((j) => j.city === filters.city);
    if (filters.workMode) list = list.filter((j) => j.workMode === filters.workMode);
    if (filters.employmentType) list = list.filter((j) => j.employmentType === filters.employmentType);
    if (filters.experienceLevel) list = list.filter((j) => j.experienceLevel === filters.experienceLevel);
    return list;
  }

  return {
    async listJobs(filters: JobFilters, page: PageRequest): Promise<Paginated<JobSummary>> {
      const all = applyFilters(await fetchSummaries(), filters);
      const limit = page.limit ?? 9;
      const start = page.cursor ? Number.parseInt(page.cursor, 10) || 0 : 0;
      const slice = all.slice(start, start + limit);
      const nextIndex = start + limit;
      return { items: slice, nextCursor: nextIndex < all.length ? String(nextIndex) : null, totalHint: all.length };
    },
    async getJob(): Promise<JobPublication | null> {
      // Full block-based publications are not modelled in the sheet; the ATS/
      // Supabase owns rich content. Return null so the caller can fall back.
      return null;
    },
    async getFeatured(limit = 3): Promise<JobSummary[]> {
      const all = await fetchSummaries();
      return all.filter((j) => j.featured).slice(0, limit);
    },
    async getFacets() {
      const all = await fetchSummaries();
      return {
        areas: [...new Set(all.map((j) => j.area))].sort(),
        cities: [...new Set(all.map((j) => j.city))].sort(),
      };
    },
  };
}

export function createAppsScriptProvider(publicReadUrl: string): DataProvider {
  const fallback = createMockProvider();
  return {
    ...fallback,
    mode: 'apps-script',
    jobs: createAppsScriptJobsRepository(publicReadUrl),
  };
}
