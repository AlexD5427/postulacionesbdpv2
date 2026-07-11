import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AssessmentRunner } from '@/features/assessments/components/AssessmentRunner';

export const metadata: Metadata = { title: 'Evaluación' };

export default async function AssessmentRunnerPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/candidate/assessments"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a mis evaluaciones
      </Link>
      <AssessmentRunner assessmentId={assessmentId} />
    </div>
  );
}
