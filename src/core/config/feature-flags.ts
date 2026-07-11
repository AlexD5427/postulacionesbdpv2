import { env } from './env';

/**
 * Typed feature flags derived from validated env. Import `featureFlags`
 * instead of reading `process.env` in components so flags are discoverable and
 * testable. Flags gate optional/expensive/future capabilities.
 */
export const featureFlags = {
  /** Optional WebGL ambient scene (Tier 3). Off by default. */
  webgl: env.NEXT_PUBLIC_ENABLE_WEBGL,
  /** Muted decorative ambient video on hero surfaces. */
  ambientVideo: env.NEXT_PUBLIC_ENABLE_AMBIENT_VIDEO,
  /** Assessment engine + runner. */
  assessments: env.NEXT_PUBLIC_ENABLE_ASSESSMENTS,
  /** Isolated integrity telemetry subsystem. */
  assessmentTelemetry: env.NEXT_PUBLIC_ENABLE_ASSESSMENT_TELEMETRY,
  /** Cover letters feature. */
  coverLetters: env.NEXT_PUBLIC_ENABLE_COVER_LETTERS,
  /** Data providers. */
  supabase: env.NEXT_PUBLIC_ENABLE_SUPABASE,
  googleAppsScript: env.NEXT_PUBLIC_ENABLE_GOOGLE_APPS_SCRIPT,
  archiveApi: env.NEXT_PUBLIC_ENABLE_ARCHIVE_API,
  /** Future AI assistance — must stay OFF until legally reviewed. */
  aiAssist: env.NEXT_PUBLIC_ENABLE_AI_ASSIST,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
