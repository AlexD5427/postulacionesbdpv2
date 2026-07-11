import { describe, expect, it } from 'vitest';
import { queryJobs } from './mock-provider';
import { seedJobs } from './seed/jobs.seed';
import { FORBIDDEN_INTERNAL_FIELDS } from '@/infrastructure/mappers/public-dto';

describe('queryJobs (mock)', () => {
  it('returns only published jobs as public summaries', () => {
    const result = queryJobs(seedJobs, {}, { limit: 100 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.totalHint).toBe(result.items.length);
  });

  it('filters by free-text query across title/area/reference', () => {
    const result = queryJobs(seedJobs, { query: 'crédito' }, { limit: 100 });
    expect(result.items.every((j) => `${j.title} ${j.area}`.toLowerCase().includes('créd'))).toBe(true);
  });

  it('filters by area', () => {
    const result = queryJobs(seedJobs, { area: 'Operaciones' }, { limit: 100 });
    expect(result.items.every((j) => j.area === 'Operaciones')).toBe(true);
  });

  it('paginates with a stable cursor', () => {
    const page1 = queryJobs(seedJobs, {}, { limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).toBe('2');
    const page2 = queryJobs(seedJobs, {}, { cursor: page1.nextCursor, limit: 2 });
    expect(page2.items[0]?.id).not.toBe(page1.items[0]?.id);
  });

  it('sorts by title when requested', () => {
    const result = queryJobs(seedJobs, { sort: 'title' }, { limit: 100 });
    const titles = result.items.map((j) => j.title);
    expect([...titles].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(titles);
  });

  it('never exposes forbidden internal fields in summaries', () => {
    const result = queryJobs(seedJobs, {}, { limit: 100 });
    const forbidden = new Set(FORBIDDEN_INTERNAL_FIELDS.map((f) => f.toLowerCase()));
    for (const item of result.items) {
      for (const key of Object.keys(item)) {
        expect(forbidden.has(key.toLowerCase())).toBe(false);
      }
    }
  });
});
