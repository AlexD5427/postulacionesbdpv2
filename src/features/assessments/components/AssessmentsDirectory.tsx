'use client';

import Link from 'next/link';
import { ClipboardCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAssessmentInvitations } from '../hooks/use-assessments';
import { Card, CardTitle } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Badge } from '@/design-system/primitives/Badge';
import { Button } from '@/design-system/primitives/Button';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { Alert } from '@/shared/components/Alert';
import { formatLongDate } from '@/shared/utils/dates';

const STATUS = {
  pending: { label: 'Pendiente', tone: 'warning' as const },
  in_progress: { label: 'En curso', tone: 'info' as const },
  completed: { label: 'Completada', tone: 'success' as const },
  expired: { label: 'Expirada', tone: 'neutral' as const },
};

export function AssessmentsDirectory() {
  const { data: invitations, isLoading } = useAssessmentInvitations();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="info" title="Sobre las evaluaciones">
        Las evaluaciones son demostrativas y no constituyen un diagnóstico clínico ni psicométrico. Antes
        de comenzar verás una explicación clara de la información técnica que se registra.
      </Alert>

      {(invitations ?? []).length === 0 ? (
        <GlassSurface variant="standard" radius="3xl" padding="lg" className="flex flex-col items-center gap-3 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold">No tienes evaluaciones asignadas</h2>
          <p className="text-muted-foreground">Cuando el banco te asigne una evaluación, aparecerá aquí.</p>
        </GlassSurface>
      ) : (
        <ul className="flex flex-col gap-4">
          {(invitations ?? []).map((invitation) => {
            const status = STATUS[invitation.status];
            const done = invitation.status === 'completed' || invitation.status === 'expired';
            return (
              <li key={invitation.id}>
                <Card className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                        {invitation.assessmentTitle}
                      </CardTitle>
                      {invitation.jobTitle && (
                        <p className="text-sm text-muted-foreground">Para: {invitation.jobTitle}</p>
                      )}
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>Invitación:</dt>
                      <dd>{formatLongDate(invitation.invitedAt)}</dd>
                    </div>
                    {invitation.expiresAt && (
                      <div className="flex gap-1">
                        <dt>Disponible hasta:</dt>
                        <dd>{formatLongDate(invitation.expiresAt)}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-1">
                    <Button asChild disabled={done} variant={done ? 'outline' : 'primary'}>
                      {done ? (
                        <span aria-disabled>{invitation.status === 'completed' ? 'Completada' : 'No disponible'}</span>
                      ) : (
                        <Link href={`/candidate/assessments/${invitation.assessmentId}`}>
                          {invitation.status === 'in_progress' ? 'Continuar' : 'Comenzar'}
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      )}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
