import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobCard } from './JobCard';
import type { JobSummary } from '@/shared/types/domain';

const job: JobSummary = {
  id: 'j1',
  reference: 'BDP-CRE-001',
  title: 'Oficial de Créditos',
  area: 'Créditos',
  city: 'La Paz',
  workMode: 'on_site',
  employmentType: 'full_time',
  experienceLevel: 'mid',
  shortDescription: 'Acompaña a emprendedores en el acceso a financiamiento.',
  publishedAt: '2026-01-01T00:00:00.000Z',
  closesAt: '2026-03-01T00:00:00.000Z',
  featured: true,
  sourceProvider: 'mock',
};

describe('JobCard', () => {
  it('shows neutral public information', () => {
    render(<JobCard job={job} />);
    expect(screen.getByRole('heading', { name: /Oficial de Créditos/ })).toBeInTheDocument();
    expect(screen.getByText('BDP-CRE-001')).toBeInTheDocument();
    expect(screen.getByText(/La Paz/)).toBeInTheDocument();
  });

  it('NEVER shows a match/affinity/fit score or candidate counts (product rule)', () => {
    const { container } = render(<JobCard job={job} />);
    const text = container.textContent?.toLowerCase() ?? '';
    for (const forbidden of ['afinidad', 'match', 'compatib', 'probabilidad', 'ranking', 'puntaje', 'score', 'candidatos compit']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
