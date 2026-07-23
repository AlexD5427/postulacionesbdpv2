'use client';

import Link from 'next/link';
import { Logo } from './Logo';
import { BdpLettermark } from './brand/BdpLettermark';
import { useTranslation } from '@/features/i18n/use-translation';
import type { TranslationKey } from '@/features/i18n/dictionary';
import { appConfig } from '@/core/config/app-config';

const COLUMNS: Array<{ titleKey: TranslationKey; links: Array<{ href: string; labelKey: TranslationKey }> }> = [
  {
    titleKey: 'footer.col.talent',
    links: [
      { href: '/jobs', labelKey: 'footer.link.jobs' },
      { href: '/register', labelKey: 'footer.link.register' },
      { href: '/login', labelKey: 'footer.link.login' },
    ],
  },
  {
    titleKey: 'footer.col.resources',
    links: [
      { href: '/help', labelKey: 'footer.link.help' },
      { href: '/accessibility', labelKey: 'footer.link.accessibility' },
    ],
  },
  {
    titleKey: 'footer.col.legal',
    links: [
      { href: '/privacy', labelKey: 'footer.link.privacy' },
      { href: '/terms', labelKey: 'footer.link.terms' },
    ],
  },
];

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="relative mt-16 px-3 pb-24">
      <div className="glass-subtle container-page mx-auto overflow-hidden rounded-4xl p-8 md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">{t('footer.about')}</p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.titleKey} aria-label={t(column.titleKey)} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">{t(column.titleKey)}</h2>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        {/* Oversized brand flourish, softly clipped at the baseline. */}
        <div className="pointer-events-none mt-8 -mb-6 select-none opacity-[0.07]" aria-hidden>
          <BdpLettermark tone="mono" className="h-16 w-auto text-foreground md:h-24" />
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} {appConfig.organization.legalName}. {t('footer.rights')}
          </p>
          <p>{t('footer.nopay')}</p>
        </div>
      </div>
    </footer>
  );
}
