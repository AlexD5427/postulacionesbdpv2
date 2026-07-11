import type { JobFilters } from '@/shared/types/domain';

/**
 * Centralised TanStack Query keys. Keeping them here avoids typos and makes
 * cache invalidation explicit and greppable.
 */
export const queryKeys = {
  session: ['session'] as const,
  account: ['account'] as const,
  profile: ['profile'] as const,
  cv: ['cv'] as const,
  coverLetters: ['cover-letters'] as const,
  coverLetter: (id: string) => ['cover-letters', id] as const,
  jobs: (filters: JobFilters) => ['jobs', filters] as const,
  job: (id: string) => ['job', id] as const,
  featuredJobs: ['jobs', 'featured'] as const,
  jobFacets: ['jobs', 'facets'] as const,
  applications: ['applications'] as const,
  application: (id: string) => ['applications', id] as const,
  applicationDraft: (jobId: string) => ['applications', 'draft', jobId] as const,
  assessmentInvitations: ['assessments', 'invitations'] as const,
  assessmentDefinition: (id: string) => ['assessments', 'definition', id] as const,
  assessmentAttempt: (id: string) => ['assessments', 'attempt', id] as const,
  notifications: ['notifications'] as const,
  notificationPreferences: ['notifications', 'preferences'] as const,
};
