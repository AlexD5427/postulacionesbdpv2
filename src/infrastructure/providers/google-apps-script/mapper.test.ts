import { describe, expect, it } from 'vitest';
import { mapAppsScriptJobToSummary } from './mapper';
import type { AppsScriptJobRow } from './schema';

const base: AppsScriptJobRow = {
  externalReference: 'BDP-CRE-001',
  title: 'Oficial de Créditos',
  area: 'Créditos',
  city: 'La Paz',
  shortDescription: 'desc',
};

describe('mapAppsScriptJobToSummary', () => {
  it('normalises Spanish work-mode strings to domain enums', () => {
    expect(mapAppsScriptJobToSummary({ ...base, workMode: 'Remoto' }).workMode).toBe('remote');
    expect(mapAppsScriptJobToSummary({ ...base, workMode: 'Híbrido' }).workMode).toBe('hybrid');
    expect(mapAppsScriptJobToSummary({ ...base, workMode: 'cualquier cosa' }).workMode).toBe('on_site');
  });

  it('normalises employment type and experience level with safe defaults', () => {
    expect(mapAppsScriptJobToSummary({ ...base, employmentType: 'Pasantía' }).employmentType).toBe('internship');
    expect(mapAppsScriptJobToSummary({ ...base, experienceLevel: 'senior' }).experienceLevel).toBe('senior');
    expect(mapAppsScriptJobToSummary({ ...base }).experienceLevel).toBe('mid');
  });

  it('parses loose boolean values for featured', () => {
    expect(mapAppsScriptJobToSummary({ ...base, featured: 'sí' }).featured).toBe(true);
    expect(mapAppsScriptJobToSummary({ ...base, featured: 'x' }).featured).toBe(true);
    expect(mapAppsScriptJobToSummary({ ...base, featured: 'no' }).featured).toBe(false);
    expect(mapAppsScriptJobToSummary({ ...base, featured: true }).featured).toBe(true);
  });

  it('tags the source provider as google_sheets and prefixes the id', () => {
    const summary = mapAppsScriptJobToSummary(base);
    expect(summary.sourceProvider).toBe('google_sheets');
    expect(summary.id).toBe('gs:BDP-CRE-001');
    expect(summary.reference).toBe('BDP-CRE-001');
  });

  it('discards accidental internal fields coming from the sheet', () => {
    const row = { ...base, fitScore: 0.9, rank: 2 } as unknown as AppsScriptJobRow;
    const summary = mapAppsScriptJobToSummary(row) as unknown as Record<string, unknown>;
    expect(summary.fitScore).toBeUndefined();
    expect(summary.rank).toBeUndefined();
  });
});
