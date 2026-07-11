import { z } from 'zod';

/**
 * Wire schema for the Apps Script public read endpoint.
 *
 * The spreadsheet is business-managed and therefore UNTRUSTED input. We accept
 * loose strings and normalise/validate here rather than trusting the shape.
 * `schemaVersion` lets us reject incompatible payloads. See
 * HYBRID_SUPABASE_APPS_SCRIPT.md.
 */
export const appsScriptJobRowSchema = z.object({
  externalReference: z.string().min(1),
  title: z.string().min(1),
  area: z.string().default('General'),
  city: z.string().default('La Paz'),
  workMode: z.string().optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  shortDescription: z.string().default(''),
  publishedAt: z.string().optional(),
  closesAt: z.string().nullable().optional(),
  featured: z.union([z.boolean(), z.string()]).optional(),
  status: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  coverImageAlt: z.string().optional(),
  sourceVersion: z.string().optional(),
});

export const appsScriptResponseSchema = z.object({
  schemaVersion: z.number(),
  generatedAt: z.string().optional(),
  jobs: z.array(appsScriptJobRowSchema),
});

export type AppsScriptJobRow = z.infer<typeof appsScriptJobRowSchema>;
export type AppsScriptResponse = z.infer<typeof appsScriptResponseSchema>;

/** Highest wire schema version this client understands. */
export const SUPPORTED_APPS_SCRIPT_SCHEMA = 1;
