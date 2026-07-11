import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { ApplicationsView } from '@/features/applications/components/ApplicationsView';

export const metadata: Metadata = { title: 'Mis postulaciones' };

export default function ApplicationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mis postulaciones"
        description="Consulta el registro de tus postulaciones y las comunicaciones del banco."
      />
      <ApplicationsView />
    </div>
  );
}
