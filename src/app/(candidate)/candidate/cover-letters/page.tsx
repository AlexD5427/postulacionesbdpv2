import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { CoverLettersView } from '@/features/cv/components/CoverLettersView';
import { featureFlags } from '@/core/config/feature-flags';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';

export const metadata: Metadata = { title: 'Cartas de presentación' };

export default function CoverLettersPage() {
  if (!featureFlags.coverLetters) {
    return (
      <GlassSurface variant="standard" radius="3xl" padding="lg">
        <p className="text-muted-foreground">La función de cartas de presentación no está habilitada.</p>
      </GlassSurface>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cartas de presentación"
        description="Crea y reutiliza cartas para tus postulaciones. Puedes partir de una plantilla."
      />
      <CoverLettersView />
    </div>
  );
}
