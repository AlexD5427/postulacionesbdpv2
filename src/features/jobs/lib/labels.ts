import type { EmploymentType, ExperienceLevel, WorkMode } from '@/shared/types/domain';

/** Human-friendly Spanish labels for job enums (single source of truth). */
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  on_site: 'Presencial',
  hybrid: 'Híbrido',
  remote: 'Remoto',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  temporary: 'Temporal',
  internship: 'Pasantía',
  consultancy: 'Consultoría',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Inicial',
  junior: 'Junior',
  mid: 'Intermedio',
  senior: 'Senior',
  lead: 'Liderazgo',
};

export const SORT_LABELS: Record<'recent' | 'closing_soon' | 'title', string> = {
  recent: 'Más recientes',
  closing_soon: 'Cierran pronto',
  title: 'Título (A-Z)',
};
