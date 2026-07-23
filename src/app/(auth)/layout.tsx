'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { Logo } from '@/shared/components/Logo';
import { BdpMark } from '@/shared/components/brand/BdpMark';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { ThemeToggle } from '@/design-system/themes/ThemeToggle';
import { LanguageSwitcher } from '@/features/i18n/LanguageSwitcher';
import { useTranslation } from '@/features/i18n/use-translation';

/**
 * Split-screen authentication shell. A brand-gradient aside (with floating
 * liquid orbs and value props) balances the calm glass form on the right. The
 * aside collapses to a slim brand header on small screens. Language, theme and
 * the accessibility launcher stay reachable throughout.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand aside */}
      <aside className="section-brand grain relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <Logo href="/" onBrand />
        <div className="relative z-content flex flex-col gap-6">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/12 p-4 shadow-glass-xl backdrop-blur">
            <BdpMark tone="white" className="h-full w-full" />
          </div>
          <h2 className="text-display max-w-md text-4xl text-white">{t('auth.aside.title')}</h2>
          <p className="max-w-sm text-on-brand-muted">{t('auth.aside.subtitle')}</p>
          <ul className="flex flex-col gap-3">
            {['auth.aside.p1', 'auth.aside.p2', 'auth.aside.p3'].map((key) => (
              <li key={key} className="flex items-center gap-3 text-on-brand">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t(key as Parameters<typeof t>[0])}
              </li>
            ))}
          </ul>
        </div>
        <span className="liquid-orb -bottom-10 -left-10 h-40 w-40 opacity-40" style={{ ['--orb-float' as string]: '9s' }} />
        <span className="liquid-orb right-8 top-24 h-16 w-16 opacity-50" style={{ ['--orb-float' as string]: '7s' }} />
      </aside>

      {/* Form side */}
      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-5 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('nav.home')}
          </Link>
          <span className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/jobs"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
            >
              {t('auth.backToJobs')}
            </Link>
          </div>
        </header>
        <main id="main-content" className="flex flex-1 items-center justify-center px-5 py-8 md:px-8">
          <GlassSurface variant="elevated" radius="3xl" padding="lg" className="glass-sheen w-full max-w-md">
            {children}
          </GlassSurface>
        </main>
      </div>
    </div>
  );
}
