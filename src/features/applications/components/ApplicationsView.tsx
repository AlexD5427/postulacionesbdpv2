'use client';

import Link from 'next/link';
import { Send, ArrowRight } from 'lucide-react';
import { useApplications } from '../hooks/use-applications';
import { Card } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Badge } from '@/design-system/primitives/Badge';
import { Button } from '@/design-system/primitives/Button';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { formatLongDate, formatRelative } from '@/shared/utils/dates';

const LIFECYCLE = {
  draft: { label: 'Borrador', tone: 'warning' as const },
  submitted: { label: 'Enviada', tone: 'success' as const },
  withdrawn: { label: 'Retirada', tone: 'neutral' as const },
};

export function ApplicationsView() {
  const { data: applications, isLoading } = useApplications();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
    );
  }

  if ((applications ?? []).length === 0) {
    return (
      <GlassSurface variant="standard" radius="3xl" padding="lg" className="flex flex-col items-center gap-3 text-center">
        <Send className="h-8 w-8 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">Aún no tienes postulaciones</h2>
        <p className="text-muted-foreground">Explora las convocatorias abiertas y postula en minutos.</p>
        <Button asChild>
          <Link href="/jobs">Ver convocatorias</Link>
        </Button>
      </GlassSurface>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {(applications ?? []).map((app) => {
        const status = LIFECYCLE[app.lifecycle];
        const pendingActions = app.actionRequests.filter((a) => !a.resolved).length;
        return (
          <li key={app.meta.id}>
            <Card className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{app.jobTitle}</h2>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {pendingActions > 0 && <Badge tone="warning">Acción requerida</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{app.jobReference}</p>
                </div>
                {app.confirmationNumber && (
                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground">N.º de confirmación</p>
                    <p className="font-mono text-sm font-semibold">{app.confirmationNumber}</p>
                  </div>
                )}
              </div>

              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {app.submittedAt && (
                  <div className="flex gap-1">
                    <dt>Enviada:</dt>
                    <dd>{formatLongDate(app.submittedAt)}</dd>
                  </div>
                )}
                <div className="flex gap-1">
                  <dt>Actualizada:</dt>
                  <dd>{formatRelative(app.updatedAt)}</dd>
                </div>
              </dl>

              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {app.messages.length > 0 ? `${app.messages.length} comunicación(es)` : 'Sin comunicaciones nuevas'}
                </span>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/candidate/applications/${app.meta.id}`}>
                    Ver detalle
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
