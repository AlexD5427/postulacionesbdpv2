import type { ProficiencyLevel } from '@/shared/types/domain';

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  basic: 'Básico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
  native: 'Nativo',
};

export const PROFICIENCY_OPTIONS = (Object.keys(PROFICIENCY_LABELS) as ProficiencyLevel[]).map((value) => ({
  value,
  label: PROFICIENCY_LABELS[value],
}));
