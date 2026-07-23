'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { LOCALES, LOCALE_META, type Locale } from './config';
import { useTranslation } from './use-translation';
import { cn } from '@/shared/lib/cn';

/**
 * Language switcher for the four supported locales (es / en / qu / ay).
 *
 * - `variant="menu"` (default): a compact glass popover used in the navbar/dock.
 * - `variant="inline"`: a segmented control used inside the accessibility panel.
 */
export function LanguageSwitcher({
  variant = 'menu',
  onBrand = false,
}: {
  variant?: 'menu' | 'inline';
  onBrand?: boolean;
}) {
  const { t, locale, setLocale } = useTranslation();

  if (variant === 'inline') {
    return (
      <div role="group" aria-label={t('lang.change')} className="grid grid-cols-2 gap-2">
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              aria-pressed={active}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary text-primary-foreground shadow-glass-sm'
                  : 'glass-subtle text-foreground hover:bg-muted',
              )}
            >
              <span aria-hidden>{LOCALE_META[code].flag}</span>
              {LOCALE_META[code].endonym}
            </button>
          );
        })}
      </div>
    );
  }

  return <LanguageMenu locale={locale} setLocale={setLocale} label={t('lang.change')} onBrand={onBrand} />;
}

function LanguageMenu({
  locale,
  setLocale,
  label,
  onBrand,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  label: string;
  onBrand: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          onBrand
            ? 'text-white hover:bg-white/15'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="glass-elevated absolute right-0 z-overlay mt-2 w-44 rounded-2xl p-1.5 shadow-glass-lg"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                )}
              >
                <span aria-hidden className="text-base">
                  {LOCALE_META[code].flag}
                </span>
                <span className="flex-1">{LOCALE_META[code].endonym}</span>
                {active && <Check className="h-4 w-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
