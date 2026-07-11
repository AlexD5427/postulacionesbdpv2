'use client';

import Link from 'next/link';
import { Download, ClipboardCheck, Inbox, AlertCircle } from 'lucide-react';
import { useApplication, useWithdrawApplication } from '../hooks/use-applications';
import { Card, CardTitle } from '@/design-system/primitives/Card';
import { Badge } from '@/design-system/primitives/Badge';
import { Button } from '@/design-system/primitives/Button';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { Alert } from '@/shared/components/Alert';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/design-system/primitives/Dialog';
import { formatLongDate } from '@/shared/utils/dates';

export function ApplicationDetail({ id }: { id: string }) {
  const { data: app, isLoading } = useApplication(id);
  const withdraw = useWithdrawApplication();

  if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;
  if (!app) {
    return (
      <Alert tone="warning" title="No encontramos esta postulación">
        Es posible que haya sido retirada o que el enlace no sea válido.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">{app.jobTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">{app.jobReference}</p>
          </div>
          <Badge tone={app.lifecycle === 'submitted' ? 'success' : app.lifecycle === 'withdrawn' ? 'neutral' : 'warning'}>
            {app.lifecycle === 'submitted' ? 'Enviada' : app.lifecycle === 'withdrawn' ? 'Retirada' : 'Borrador'}
          </Badge>
        </div>

        {app.confirmationNumber && (
          <div className="flex flex-wrap gap-6 rounded-2xl bg-muted/50 p-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">N.º de confirmación</p>
              <p className="font-mono text-lg font-semibold">{app.confirmationNumber}</p>
            </div>
            {app.submittedAt && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Fecha de envío</p>
                <p className="text-lg font-semibold">{formatLongDate(app.submittedAt)}</p>
              </div>
            )}
          </div>
        )}

        {/* Neutral note — deliberately NO internal process timeline/stage. */}
        <Alert tone="info">
          El banco se comunicará contigo directamente si tu perfil avanza en el proceso. No mostramos
          etapas internas ni posiciones entre candidatos.
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled title="Disponible próximamente">
            <Download className="h-4 w-4" aria-hidden />
            Descargar comprobante
          </Button>
          {app.withdrawable && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Retirar postulación
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle className="text-xl font-semibold">¿Retirar tu postulación?</DialogTitle>
                <DialogDescription className="mt-2 text-muted-foreground">
                  Ya no serás considerado(a) en este proceso. Podrás volver a postular si la
                  convocatoria sigue abierta.
                </DialogDescription>
                <div className="mt-6 flex justify-end gap-3">
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger" loading={withdraw.isPending} onClick={() => withdraw.mutate(app.meta.id)}>
                      Sí, retirar
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>

      {/* Assessment invitation */}
      {app.assessmentInvitationId && (
        <Card className="gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
            Evaluación asignada
          </CardTitle>
          <p className="text-muted-foreground">Tienes una evaluación disponible para esta postulación.</p>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/candidate/assessments">Ir a mis evaluaciones</Link>
          </Button>
        </Card>
      )}

      {/* Candidate-visible action requests */}
      {app.actionRequests.length > 0 && (
        <Card className="gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-warning" aria-hidden />
            Acciones solicitadas
          </CardTitle>
          <ul className="flex flex-col gap-2">
            {app.actionRequests.map((action) => (
              <li key={action.id} className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3">
                <div>
                  <p className="font-medium">{action.label}</p>
                  {action.description && <p className="text-sm text-muted-foreground">{action.description}</p>}
                </div>
                <Badge tone={action.resolved ? 'success' : 'warning'}>{action.resolved ? 'Resuelta' : 'Pendiente'}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Candidate-visible messages */}
      <Card className="gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="h-5 w-5 text-primary" aria-hidden />
          Comunicaciones
        </CardTitle>
        {app.messages.length === 0 ? (
          <p className="text-muted-foreground">No hay comunicaciones por el momento.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {app.messages.map((message) => (
              <li key={message.id} className="rounded-xl bg-muted/40 p-3">
                <p className="font-medium">{message.subject}</p>
                <p className="text-sm text-muted-foreground">{message.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatLongDate(message.sentAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
