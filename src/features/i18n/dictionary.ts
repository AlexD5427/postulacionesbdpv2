import type { Locale } from './config';
import { DEFAULT_LOCALE } from './config';
import { es, type Dictionary, type TranslationKey } from './dictionaries/es';
import { en } from './dictionaries/en';
import { qu } from './dictionaries/qu';
import { ay } from './dictionaries/ay';

export type { Dictionary, TranslationKey };

/** Registry of all locale dictionaries. `es` is complete; others are partial. */
const DICTIONARIES: Record<Locale, Partial<Dictionary>> = { es, en, qu, ay };

/**
 * Resolve a translation key for a locale with a graceful fallback chain:
 * requested locale → Spanish (source of truth) → the key itself. This means a
 * missing Quechua/Aymara string simply shows the Spanish text rather than a
 * broken placeholder.
 *
 * Optional `vars` interpolates `{name}` style placeholders.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const table = DICTIONARIES[locale] ?? {};
  const raw = table[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
