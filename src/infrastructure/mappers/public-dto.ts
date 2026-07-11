import type { JobPublication, JobSummary } from '@/shared/types/domain';

/**
 * Public DTO guards.
 *
 * CRITICAL PRODUCT RULE: internal employment-decision fields must never reach
 * the public portal. Even if a provider accidentally includes them, these
 * mappers strip them before anything is rendered. See §Critical product rules.
 */
export const FORBIDDEN_INTERNAL_FIELDS = [
  'candidateRank',
  'rank',
  'hiringProbability',
  'fitScore',
  'affinity',
  'affinityScore',
  'matchPercentage',
  'match',
  'internalReviewScore',
  'reviewScore',
  'interviewerNotes',
  'rejectionReason',
  'internalProcessStage',
  'processStage',
  'stage',
  'score',
  'suitability',
  'recommendation',
] as const;

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_INTERNAL_FIELDS.map((f) => f.toLowerCase()));

/**
 * Recursively remove any forbidden internal fields from an arbitrary provider
 * record. Returns a deep-cloned, sanitised copy.
 */
export function stripInternalFields<T>(input: T, depth = 0): T {
  if (depth > 12 || input === null || typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input.map((item) => stripInternalFields(item, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (FORBIDDEN_SET.has(key.toLowerCase())) continue;
    out[key] = stripInternalFields(value, depth + 1);
  }
  return out as T;
}

/** Reduce a full publication to the lightweight summary used by directory cards. */
export function toJobSummary(job: JobPublication): JobSummary {
  return {
    id: job.meta.id,
    reference: job.reference,
    title: job.title,
    area: job.area,
    city: job.city,
    workMode: job.workMode,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    shortDescription: job.shortDescription,
    publishedAt: job.publishedAt,
    closesAt: job.closesAt,
    featured: job.featured,
    coverImageUrl: job.coverImage?.publicPreviewURL,
    coverImageAlt: job.coverImage?.altText,
    sourceProvider: job.meta.sourceProvider,
  };
}
