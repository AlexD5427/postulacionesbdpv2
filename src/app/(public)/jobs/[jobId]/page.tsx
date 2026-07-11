import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, MapPin, Briefcase, GraduationCap, Building2 } from 'lucide-react';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { InteractiveImage } from '@/features/media-content/components/InteractiveImage';
import { JobBlockRenderer } from '@/features/jobs/components/blocks/JobBlockRenderer';
import { SaveJobButton } from '@/features/jobs/components/SaveJobButton';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  WORK_MODE_LABELS,
} from '@/features/jobs/lib/labels';
import { formatLongDate, isClosed } from '@/shared/utils/dates';

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getDataProvider().jobs.getJob(jobId);
  if (!job) return { title: 'Convocatoria no encontrada' };
  return {
    title: job.title,
    description: job.shortDescription,
  };
}

export default async function JobDetailPage({ params }: Params) {
  const { jobId } = await params;
  const job = await getDataProvider().jobs.getJob(jobId);
  if (!job) notFound();

  const closed = isClosed(job.closesAt) || job.status === 'closed';
  const applyHref = `/candidate/applications/new?job=${encodeURIComponent(job.meta.id)}`;

  return (
    <article className="pb-24 md:pb-10">
      {/* HERO */}
      <header className="container-page pt-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/jobs" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Convocatorias
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{job.reference}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{job.reference}</Badge>
              {job.featured && <Badge tone="accent">Destacada</Badge>}
              {closed && <Badge tone="danger">Cerrada</Badge>}
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{job.title}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{job.shortDescription}</p>

            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" aria-hidden />
                <dt className="sr-only">Área</dt>
                <dd>{job.area}</dd>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden />
                <dt className="sr-only">Ciudad</dt>
                <dd>{job.city}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" aria-hidden />
                <dt className="sr-only">Modalidad y contrato</dt>
                <dd>
                  {WORK_MODE_LABELS[job.workMode]} · {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" aria-hidden />
                <dt className="sr-only">Nivel</dt>
                <dd>{EXPERIENCE_LEVEL_LABELS[job.experienceLevel]}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden />
              <span>Publicada el {formatLongDate(job.publishedAt)}</span>
              {job.closesAt && <span>· Cierra el {formatLongDate(job.closesAt)}</span>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" disabled={closed}>
                {closed ? <span aria-disabled>Convocatoria cerrada</span> : <Link href={applyHref}>Postular ahora</Link>}
              </Button>
              <SaveJobButton reference={job.reference} />
            </div>
          </div>

          {job.coverImage?.publicPreviewURL && (
            <GlassSurface variant="elevated" radius="3xl" padding="none" className="overflow-hidden">
              <InteractiveImage
                src={job.coverImage.publicPreviewURL}
                alt={job.coverImage.altText}
                className="aspect-[4/3] w-full"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
                focalPointX={job.coverImage.focalPointX}
                focalPointY={job.coverImage.focalPointY}
              />
            </GlassSurface>
          )}
        </div>
      </header>

      {/* BLOCKS */}
      <div className="container-page mt-12 flex max-w-3xl flex-col gap-12">
        {[...job.blocks]
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <JobBlockRenderer key={block.id} block={block} />
          ))}

        {/* Privacy reminder — never a fit score / process timeline. */}
        <GlassSurface variant="subtle" radius="2xl" padding="md" className="text-sm text-muted-foreground">
          Tu privacidad es importante. Solo usamos tu información para gestionar tu postulación. El
          banco se comunicará contigo directamente cuando corresponda.
        </GlassSurface>
      </div>

      {/* Sticky mobile apply bar */}
      {!closed && (
        <div className="glass-navigation fixed inset-x-3 bottom-3 z-nav flex items-center justify-between gap-3 rounded-full px-4 py-2.5 md:hidden">
          <span className="truncate text-sm font-medium">{job.title}</span>
          <Button asChild size="sm">
            <Link href={applyHref}>Postular</Link>
          </Button>
        </div>
      )}
    </article>
  );
}
