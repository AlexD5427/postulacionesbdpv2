'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, isLocale, LOCALE_META, type Locale } from './config';
import { I18N_STORAGE_KEY } from './storage-key';

export { I18N_STORAGE_KEY };

interface I18nStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    { name: I18N_STORAGE_KEY },
  ),
);

/**
 * Reflect the active locale onto <html lang>. Mirrors the pre-paint bootstrap in
 * layout.tsx (which handles the first paint) for subsequent changes.
 */
export function applyLocaleToDocument(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = isLocale(locale) ? LOCALE_META[locale].htmlLang : 'es-BO';
}
