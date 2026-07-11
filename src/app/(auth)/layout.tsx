import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/shared/components/Logo';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';

/**
 * Centered glass card layout for authentication pages. Kept minimal and calm;
 * the accessibility launcher (root layout) is still available.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="container-page flex items-center justify-between py-5">
        <Logo />
        <Link
          href="/jobs"
          className="text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver convocatorias
        </Link>
      </header>
      <main id="main-content" className="container-page flex flex-1 items-center justify-center py-8">
        <GlassSurface variant="elevated" radius="3xl" padding="lg" className="w-full max-w-md">
          {children}
        </GlassSurface>
      </main>
    </div>
  );
}
