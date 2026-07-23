'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, type Locale } from './config';
import { translate, type TranslationKey } from './dictionary';
import { useI18nStore } from './i18n-store';

export interface UseTranslationResult {
  /** Translate a key, with optional `{var}` interpolation. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** The active locale (defaults to Spanish until client hydration completes). */
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** True once the persisted preference has been applied on the client. */
  hydrated: boolean;
}

/**
 * Client translation hook.
 *
 * Hydration safety: the locale lives in `localStorage`, which the server cannot
 * read, so the FIRST client render (and the server render) both use the default
 * Spanish locale. After mount we switch to the persisted locale. This keeps the
 * server and first client render identical — no hydration mismatch — while
 * still honouring the user's choice a tick later.
 */
export function useTranslation(): UseTranslationResult {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const active: Locale = hydrated ? locale : DEFAULT_LOCALE;

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(active, key, vars),
    [active],
  );

  return { t, locale: active, setLocale, hydrated };
}
