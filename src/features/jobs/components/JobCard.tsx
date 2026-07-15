import Link from 'next/link';
import { CalendarClock, MapPin, Briefcase, ArrowRight } from 'lucide-react';
import type { JobSummary } from '@/shared/types/domain';
import { Card } from '@/design-system/primitives/Card';
import { Badge } from '@/design-system/primitives/Badge';
import { Button } from '@/design-system/primitives/Button';
import { InteractiveImage } from '@/features/media-content/components/InteractiveImage';
import { WORK_MODE_LABELS, EMPLOYMENT_TYPE_LABELS } from '../lib/labels';
import { formatRelative, isClosed, daysUntil } from '@/shared/utils/dates';

/**
 * Directory/landing job card.
 *
 * IMPORTANT: shows only neutral, public information. It MUST NOT display match
 * percentage, competing-candidate counts, internal urgency or any score.
 */
export function JobCard({ job }: { job: JobSummary }) {
  const closed = isClosed(job.closesAt);
  const days = daysUntil(job.closesAt);
  const closingSoon = days !== null && days >= 0 && days <= 7;

  return (
    <Card padding="none" radius="3xl" className="group glass-interactive h-full overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {job.coverImageUrl ? (
          <InteractiveImage
            src={job.coverImageUrl}
            alt={job.coverImageAlt ?? job.title}
            className="h-full w-full"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="grid h-full place-items-center bg-primary/10 text-primary">
            <Briefcase className="h-10 w-10" aria-hidden />
          </div>
        )}
        {job.featured && (
          <span className="absolute left-3 top-3">
            <Badge tone="primary">Destacada</Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="neutral">{job.reference}</Badge>
          <Badge tone="neutral">{WORK_MODE_LABELS[job.workMode]}</Badge>
          <Badge tone="neutral">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
        </div>

        <h3 className="text-lg font-semibold leading-snug">
          <Link
            href={`/jobs/${job.reference}`}
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-0"
          >
            {job.title}
          </Link>
        </h3>

        <p className="line-clamp-3 text-sm text-muted-foreground">{job.shortDescription}</p>

        <dl className="mt-auto flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Ubicación</dt>
            <dd>
              {job.city} · {job.area}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Estado de la convocatoria</dt>
            <dd>
              {closed
                ? 'Convocatoria cerrada'
                : job.closesAt
                  ? `Cierra ${formatRelative(job.closesAt)}`
                  : `Publicada ${formatRelative(job.publishedAt)}`}
            </dd>
          </div>
        </dl>

        <div className="relative z-content mt-2 flex items-center justify-between">
          {closingSoon && !closed ? (
            <Badge tone="warning">Cierra pronto</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Publicada {formatRelative(job.publishedAt)}</span>
          )}
          <Button asChild variant="ghost" size="sm" className="relative z-content">
            <Link href={`/jobs/${job.reference}`} aria-label={`Ver posición: ${job.title}`}>
              Ver posición
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
