'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { logger } from '@/core/observability/logger';

/** Global route error boundary. Never surfaces raw errors to the candidate. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('route error boundary', { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-16">
      <GlassSurface variant="elevated" radius="3xl" padding="lg" className="max-w-lg text-center">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-muted-foreground">
          Ocurrió un problema inesperado. Puedes intentarlo de nuevo; si persiste, vuelve más tarde.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="outline" asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </GlassSurface>
    </div>
  );
}
