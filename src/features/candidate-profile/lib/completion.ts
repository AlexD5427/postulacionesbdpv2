import type { CandidateProfile, DigitalCV } from '@/shared/types/domain';

/**
 * Profile completeness — based ONLY on how much of their own profile the
 * candidate has filled in. This is never a measure of job fit or suitability.
 */
export function computeProfileCompletion(profile: CandidateProfile | null): number {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.firstName),
    Boolean(profile.lastName),
    Boolean(profile.headline),
    Boolean(profile.professionalSummary),
    Boolean(profile.photoAssetId),
    Boolean(profile.contact.phone),
    Boolean(profile.contact.city),
    profile.preferences.preferredAreas.length > 0,
    profile.preferences.workModes.length > 0,
    Boolean(profile.preferences.availability),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

/** CV completeness — again, only about how filled-in the CV is. */
export function computeCVCompletion(cv: DigitalCV | null): number {
  if (!cv) return 0;
  const checks = [
    Boolean(cv.professionalSummary),
    cv.experiences.length > 0,
    cv.education.length > 0,
    cv.technicalSkills.length > 0,
    cv.generalSkills.length > 0,
    cv.languages.length > 0,
    Boolean(cv.availability),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
