'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Search } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/design-system/primitives/Button';
import { ThemeToggle } from '@/design-system/themes/ThemeToggle';
import { LanguageSwitcher } from '@/features/i18n/LanguageSwitcher';
import { useTranslation } from '@/features/i18n/use-translation';
import type { TranslationKey } from '@/features/i18n/dictionary';
import { toggleCommandPalette } from '@/features/shell/state/ui-store';
import { cn } from '@/shared/lib/cn';

const NAV_LINKS: Array<{ href: string; labelKey: TranslationKey }> = [
  { href: '/jobs', labelKey: 'nav.jobs' },
  { href: '/help', labelKey: 'nav.help' },
  { href: '/accessibility', labelKey: 'nav.accessibility' },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-nav px-3 pt-3">
      <nav
        className="glass-navigation container-page mx-auto flex items-center justify-between gap-4 rounded-full px-4 py-2.5"
        aria-label={t('nav.primary')}
      >
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => toggleCommandPalette()}
            aria-label={t('cmd.open')}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4" aria-hidden />
            <kbd className="text-[0.65rem] font-semibold">⌘K</kbd>
          </button>
          <span data-tour="lang">
            <LanguageSwitcher />
          </span>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('nav.login')}</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/register">{t('nav.register')}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="glass-elevated container-page mx-auto mt-2 rounded-3xl p-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link href="/login" onClick={() => setOpen(false)}>
                {t('nav.login')}
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/register" onClick={() => setOpen(false)}>
                {t('nav.register')}
              </Link>
            </Button>
            <div className="mt-2 flex items-center justify-between gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
