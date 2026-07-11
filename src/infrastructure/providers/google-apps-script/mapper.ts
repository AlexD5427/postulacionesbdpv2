import type {
  EmploymentType,
  ExperienceLevel,
  JobSummary,
  WorkMode,
} from '@/shared/types/domain';
import { stripInternalFields } from '@/infrastructure/mappers/public-dto';
import type { AppsScriptJobRow } from './schema';

/**
 * Normalise loose spreadsheet strings into strict domain enums. Unknown values
 * fall back to a safe default rather than throwing — a single malformed row must
 * not break the whole directory.
 */
function toWorkMode(value?: string): WorkMode {
  switch (value?.toLowerCase().trim()) {
    case 'remoto':
    case 'remote':
      return 'remote';
    case 'híbrido':
    case 'hibrido':
    case 'hybrid':
      return 'hybrid';
    default:
      return 'on_site';
  }
}

function toEmploymentType(value?: string): EmploymentType {
  switch (value?.toLowerCase().trim()) {
    case 'medio tiempo':
    case 'part_time':
      return 'part_time';
    case 'temporal':
    case 'temporary':
      return 'temporary';
    case 'pasantía':
    case 'pasantia':
    case 'internship':
      return 'internship';
    case 'consultoría':
    case 'consultoria':
    case 'consultancy':
      return 'consultancy';
    default:
      return 'full_time';
  }
}

function toExperienceLevel(value?: string): ExperienceLevel {
  switch (value?.toLowerCase().trim()) {
    case 'junior':
      return 'junior';
    case 'senior':
      return 'senior';
    case 'lead':
    case 'líder':
      return 'lead';
    case 'inicial':
    case 'entry':
      return 'entry';
    default:
      return 'mid';
  }
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', 'sí', 'si', '1', 'x'].includes(value.toLowerCase());
  return false;
}

/**
 * Map a validated Apps Script row into the public `JobSummary`. Any accidental
 * internal fields are stripped first (defence in depth).
 */
export function mapAppsScriptJobToSummary(rawRow: AppsScriptJobRow): JobSummary {
  const row = stripInternalFields(rawRow);
  const id = `gs:${row.externalReference}`;
  return {
    id,
    reference: row.externalReference,
    title: row.title,
    area: row.area,
    city: row.city,
    workMode: toWorkMode(row.workMode),
    employmentType: toEmploymentType(row.employmentType),
    experienceLevel: toExperienceLevel(row.experienceLevel),
    shortDescription: row.shortDescription,
    publishedAt: row.publishedAt ?? new Date().toISOString(),
    closesAt: row.closesAt ?? null,
    featured: toBoolean(row.featured),
    coverImageUrl: row.coverImageUrl,
    coverImageAlt: row.coverImageAlt,
    sourceProvider: 'google_sheets',
  };
}
