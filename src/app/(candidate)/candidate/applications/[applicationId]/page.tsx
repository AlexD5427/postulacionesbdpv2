import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ApplicationDetail } from '@/features/applications/components/ApplicationDetail';

export const metadata: Metadata = { title: 'Detalle de postulación' };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/candidate/applications"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a mis postulaciones
      </Link>
      <ApplicationDetail id={applicationId} />
    </div>
  );
}
