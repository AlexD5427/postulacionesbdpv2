import Link from 'next/link';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-16">
      <GlassSurface variant="elevated" radius="3xl" padding="lg" className="max-w-lg text-center">
        <p className="text-sm font-semibold text-primary">Error 404</p>
        <h1 className="mt-1 text-2xl font-bold">No encontramos esta página</h1>
        <p className="mt-2 text-muted-foreground">
          Es posible que el enlace haya cambiado o que la convocatoria ya no esté disponible.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/jobs">Ver convocatorias</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </GlassSurface>
    </div>
  );
}
