import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { AssessmentsDirectory } from '@/features/assessments/components/AssessmentsDirectory';
import { featureFlags } from '@/core/config/feature-flags';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';

export const metadata: Metadata = { title: 'Mis evaluaciones' };

export default function AssessmentsPage() {
  if (!featureFlags.assessments) {
    return (
      <GlassSurface variant="standard" radius="3xl" padding="lg">
        <p className="text-muted-foreground">Las evaluaciones no están habilitadas.</p>
      </GlassSurface>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Mis evaluaciones" description="Evaluaciones demostrativas asignadas a tus procesos." />
      <AssessmentsDirectory />
    </div>
  );
}
