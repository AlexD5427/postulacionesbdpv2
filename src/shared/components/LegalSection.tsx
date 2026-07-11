import type { ReactNode } from 'react';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <GlassSurface variant="standard" radius="2xl" padding="lg" className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-muted-foreground">{children}</div>
    </GlassSurface>
  );
}
