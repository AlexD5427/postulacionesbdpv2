import { z } from 'zod';

/**
 * Environment configuration, validated with Zod.
 *
 * All variables have safe defaults so the app runs in **mock mode with zero
 * configuration**. Because Next.js inlines `NEXT_PUBLIC_*` variables at build
 * time, we read them explicitly (not via a dynamic loop) so bundling works.
 *
 * Server-only secrets are intentionally NOT read here — that keeps them out of
 * any client bundle. They are read on demand inside server code only.
 */

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const dataModeSchema = z.enum(['mock', 'supabase', 'apps-script', 'hybrid']);
export type DataMode = z.infer<typeof dataModeSchema>;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Banco de Desarrollo Productivo BDP S.A.M.'),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_DATA_MODE: dataModeSchema.default('mock'),
  NEXT_PUBLIC_ENABLE_MOCKS: booleanFromString.default('true'),
  NEXT_PUBLIC_ENABLE_WEBGL: booleanFromString.default('false'),
  NEXT_PUBLIC_ENABLE_AMBIENT_VIDEO: booleanFromString.default('true'),
  NEXT_PUBLIC_ENABLE_ASSESSMENTS: booleanFromString.default('true'),
  NEXT_PUBLIC_ENABLE_ASSESSMENT_TELEMETRY: booleanFromString.default('true'),
  NEXT_PUBLIC_ENABLE_COVER_LETTERS: booleanFromString.default('true'),
  NEXT_PUBLIC_ENABLE_GOOGLE_APPS_SCRIPT: booleanFromString.default('false'),
  NEXT_PUBLIC_ENABLE_SUPABASE: booleanFromString.default('false'),
  NEXT_PUBLIC_ENABLE_ARCHIVE_API: booleanFromString.default('false'),
  NEXT_PUBLIC_ENABLE_AI_ASSIST: booleanFromString.default('false'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().or(z.literal('')).default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(''),
  NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL: z.string().url().or(z.literal('')).default(''),
  NEXT_PUBLIC_ARCHIVE_API_URL: z.string().url().or(z.literal('')).default(''),
});

/**
 * Read the raw public env into an object. Must be a static mapping so Next can
 * statically replace each reference.
 */
const rawPublicEnv = {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_DATA_MODE: process.env.NEXT_PUBLIC_DATA_MODE,
  NEXT_PUBLIC_ENABLE_MOCKS: process.env.NEXT_PUBLIC_ENABLE_MOCKS,
  NEXT_PUBLIC_ENABLE_WEBGL: process.env.NEXT_PUBLIC_ENABLE_WEBGL,
  NEXT_PUBLIC_ENABLE_AMBIENT_VIDEO: process.env.NEXT_PUBLIC_ENABLE_AMBIENT_VIDEO,
  NEXT_PUBLIC_ENABLE_ASSESSMENTS: process.env.NEXT_PUBLIC_ENABLE_ASSESSMENTS,
  NEXT_PUBLIC_ENABLE_ASSESSMENT_TELEMETRY: process.env.NEXT_PUBLIC_ENABLE_ASSESSMENT_TELEMETRY,
  NEXT_PUBLIC_ENABLE_COVER_LETTERS: process.env.NEXT_PUBLIC_ENABLE_COVER_LETTERS,
  NEXT_PUBLIC_ENABLE_GOOGLE_APPS_SCRIPT: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_APPS_SCRIPT,
  NEXT_PUBLIC_ENABLE_SUPABASE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE,
  NEXT_PUBLIC_ENABLE_ARCHIVE_API: process.env.NEXT_PUBLIC_ENABLE_ARCHIVE_API,
  NEXT_PUBLIC_ENABLE_AI_ASSIST: process.env.NEXT_PUBLIC_ENABLE_AI_ASSIST,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL: process.env.NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL,
  NEXT_PUBLIC_ARCHIVE_API_URL: process.env.NEXT_PUBLIC_ARCHIVE_API_URL,
};

/**
 * Empty strings from `.env` files should be treated as "unset" so defaults win.
 */
function coalesceEmpty(input: Record<string, string | undefined>) {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = value === '' ? undefined : value;
  }
  return out;
}

const parsed = publicEnvSchema.safeParse(coalesceEmpty(rawPublicEnv));

if (!parsed.success) {
  // Fail loudly and clearly in development; never leak values.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `[config] Variables de entorno inválidas:\n${issues}\n` +
      'Revisa tu archivo .env.local (usa .env.example como referencia).',
  );
}

export const env = parsed.data;

/**
 * Cross-field validation: if a provider is selected, its endpoint must exist.
 * In development we warn (so mock still works); other envs throw.
 */
export function assertProviderConfig(): void {
  const problems: string[] = [];
  const mode = env.NEXT_PUBLIC_DATA_MODE;

  if ((mode === 'supabase' || mode === 'hybrid') && !env.NEXT_PUBLIC_SUPABASE_URL) {
    problems.push('DATA_MODE incluye Supabase pero falta NEXT_PUBLIC_SUPABASE_URL.');
  }
  if (
    (mode === 'apps-script' || mode === 'hybrid') &&
    env.NEXT_PUBLIC_ENABLE_GOOGLE_APPS_SCRIPT &&
    !env.NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL
  ) {
    problems.push('Apps Script habilitado pero falta NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL.');
  }

  if (problems.length === 0) return;

  const message = `[config] Configuración de proveedor incompleta:\n${problems
    .map((p) => `  - ${p}`)
    .join('\n')}`;
  if (env.NEXT_PUBLIC_APP_ENV === 'development' || env.NEXT_PUBLIC_APP_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.warn(`${message}\n(Continuando: se usará el proveedor mock donde falte configuración.)`);
  } else {
    throw new Error(message);
  }
}

export const isProduction = env.NEXT_PUBLIC_APP_ENV === 'production';
export const isDevelopment = env.NEXT_PUBLIC_APP_ENV === 'development';
