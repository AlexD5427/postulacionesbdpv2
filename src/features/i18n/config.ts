/**
 * Internationalisation configuration for the BDP talent portal.
 *
 * Four locales are supported across the whole visible UI:
 *   - `es` — Español (Latinoamérica), the source-of-truth locale.
 *   - `en` — English.
 *   - `qu` — Runa Simi (Quechua).
 *   - `ay` — Aymara.
 *
 * MANDATORY RULE (see docs/I18N.md): any new user-facing string added anywhere
 * in the frontend MUST be added to the `es` dictionary and translated into the
 * other three locales. Missing keys gracefully fall back to Spanish, but that
 * is a stop-gap, not a licence to skip translation.
 */
export const LOCALES = ['es', 'en', 'qu', 'ay'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

/** Human labels shown in the language switcher (endonyms). */
export const LOCALE_META: Record<
  Locale,
  { label: string; endonym: string; flag: string; htmlLang: string }
> = {
  es: { label: 'Español', endonym: 'Español', flag: '🇧🇴', htmlLang: 'es-BO' },
  en: { label: 'English', endonym: 'English', flag: '🇬🇧', htmlLang: 'en' },
  qu: { label: 'Quechua', endonym: 'Runa Simi', flag: '🏔️', htmlLang: 'qu' },
  ay: { label: 'Aymara', endonym: 'Aymar Aru', flag: '🏔️', htmlLang: 'ay' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
