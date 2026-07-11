import type { ReactNode } from 'react';
import { PublicNavbar } from '@/shared/components/PublicNavbar';
import { PublicFooter } from '@/shared/components/PublicFooter';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <PublicNavbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
