import type { Metadata } from 'next';
import Link from 'next/link';
import { ApplicationWizard } from '@/features/applications/components/ApplicationWizard';
import { Alert } from '@/shared/components/Alert';

export const metadata: Metadata = { title: 'Nueva postulación' };

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;

  if (!job) {
    return (
      <Alert tone="warning" title="Falta la convocatoria">
        No se indicó a qué convocatoria postular.{' '}
        <Link className="underline" href="/jobs">
          Explora las convocatorias
        </Link>
        .
      </Alert>
    );
  }

  return <ApplicationWizard jobId={job} />;
}
