'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../hooks/use-auth';
import { Spinner } from '@/design-system/primitives/Spinner';

/**
 * Client-side auth guard for the candidate area.
 *
 * IMPORTANT: this is a UX convenience, NOT a security boundary. Route hiding is
 * never authorization — the backend must validate every request server-side
 * (see SECURITY.md §Authentication boundary). Here we simply redirect
 * unauthenticated users to the login page and preserve their destination.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !session) {
      const returnTo = encodeURIComponent(pathname);
      router.replace(`/login?returnTo=${returnTo}`);
    }
  }, [isLoading, session, pathname, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner label="Verificando tu sesión…" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner label="Redirigiendo a inicio de sesión…" />
      </div>
    );
  }

  return <>{children}</>;
}
