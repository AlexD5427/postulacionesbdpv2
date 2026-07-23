import type { ReactNode } from 'react';
import { PublicNavbar } from '@/shared/components/PublicNavbar';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { CandidateSidebar } from '@/features/candidate-profile/components/CandidateNav';

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <PublicNavbar />
      <RequireAuth>
        <div className="container-page grid flex-1 gap-8 py-8 lg:grid-cols-[16rem_1fr]">
          <aside className="hidden lg:block">
            <CandidateSidebar />
          </aside>
          {/* Bottom padding clears the floating dock (primary nav on mobile). */}
          <main id="main-content" className="min-w-0 pb-28">
            {children}
          </main>
        </div>
      </RequireAuth>
    </div>
  );
}
