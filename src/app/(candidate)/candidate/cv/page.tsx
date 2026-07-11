import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { CVEditor } from '@/features/cv/components/CVEditor';

export const metadata: Metadata = { title: 'CV digital' };

export default function CVPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="CV digital"
        description="Construye tu CV una sola vez y reutilízalo en cada postulación. Los cambios se guardan automáticamente."
      />
      <CVEditor />
    </div>
  );
}
