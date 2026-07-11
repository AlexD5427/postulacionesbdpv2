import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_INTERNAL_FIELDS,
  stripInternalFields,
  toJobSummary,
} from './public-dto';
import type { JobPublication } from '@/shared/types/domain';

describe('stripInternalFields', () => {
  it('removes forbidden internal decision fields at the top level', () => {
    const input = {
      title: 'Oficial de Créditos',
      fitScore: 0.92,
      rank: 3,
      hiringProbability: 0.4,
    };
    const output = stripInternalFields(input) as Record<string, unknown>;
    expect(output.title).toBe('Oficial de Créditos');
    expect(output.fitScore).toBeUndefined();
    expect(output.rank).toBeUndefined();
    expect(output.hiringProbability).toBeUndefined();
  });

  it('removes forbidden fields deeply inside nested objects and arrays', () => {
    const input = {
      job: {
        title: 'X',
        candidateRank: 1,
        nested: [{ interviewerNotes: 'secret', ok: true }],
      },
    };
    const output = stripInternalFields(input) as { job: { candidateRank?: unknown; nested: Array<Record<string, unknown>> } };
    expect(output.job.candidateRank).toBeUndefined();
    expect(output.job.nested[0]?.interviewerNotes).toBeUndefined();
    expect(output.job.nested[0]?.ok).toBe(true);
  });

  it('is case-insensitive on forbidden keys', () => {
    const output = stripInternalFields({ FitScore: 1, MatchPercentage: 50, keep: 'yes' }) as Record<string, unknown>;
    expect(output.FitScore).toBeUndefined();
    expect(output.MatchPercentage).toBeUndefined();
    expect(output.keep).toBe('yes');
  });

  it('covers every documented forbidden field name', () => {
    const payload = Object.fromEntries(FORBIDDEN_INTERNAL_FIELDS.map((f) => [f, 'x']));
    const output = stripInternalFields(payload) as Record<string, unknown>;
    expect(Object.keys(output)).toHaveLength(0);
  });
});

describe('toJobSummary', () => {
  it('projects only public fields and never leaks blocks', () => {
    const job = {
      meta: { id: 'j1', externalReference: 'BDP-1', sourceProvider: 'mock', authoritative: true },
      reference: 'BDP-1',
      title: 'Cajero',
      area: 'Operaciones',
      city: 'La Paz',
      workMode: 'on_site',
      employmentType: 'full_time',
      experienceLevel: 'entry',
      shortDescription: 'desc',
      publishedAt: '2026-01-01T00:00:00.000Z',
      closesAt: null,
      status: 'published',
      featured: true,
      blocks: [{ id: 'b1', type: 'hero' }],
      applicationQuestions: [],
      tags: [],
    } as unknown as JobPublication;

    const summary = toJobSummary(job) as unknown as Record<string, unknown>;
    expect(summary.title).toBe('Cajero');
    expect(summary.sourceProvider).toBe('mock');
    expect(summary.blocks).toBeUndefined();
    expect(summary.applicationQuestions).toBeUndefined();
  });
});
