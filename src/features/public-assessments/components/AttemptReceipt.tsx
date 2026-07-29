'use client';

import Link from 'next/link';
import { CheckCircle2, Home } from 'lucide-react';
import type { PublicAttemptReceipt } from '@/shared/types/domain';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { Alert } from '@/shared/components/Alert';
import { formatDateTime } from '@/shared/utils/dates';

interface Props {
  assessmentTitle: string;
  receipt: PublicAttemptReceipt;
}

/**
 * Completion receipt.
 *
 * Rules the ATS handoff makes explicit (§6):
 *  · When `gradingStatus` is `pending_manual_review` the score is `null`. We show
 *    "under review" and **never** a zero.
 *  · A score only appears if the backend actually sent one, which only happens
 *    when the assessment policy allows the candidate to see it.
 *  · Correct answers are never shown, because they never reach the browser.
 */
export function AttemptReceipt({ assessmentTitle, receipt }: Props) {
  const pending = receipt.gradingStatus === 'pending_manual_review';
  const hasScore = typeof receipt.score === 'number';

  return (
    <GlassSurface
      variant="elevated"
      radius="3xl"
      padding="lg"
      className="glass-sheen mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center"
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-9 w-9" aria-hidden />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Tus respuestas fueron recibidas correctamente</h1>
        <p className="text-muted-foreground">
          Gracias por completar <strong className="text-foreground">{assessmentTitle}</strong>. El
          equipo responsable revisará la información y continuará con el proceso correspondiente.
        </p>
      </div>

      {receipt.idempotentReplay && (
        <Alert tone="info" className="w-full text-left">
          Ya teníamos este envío registrado, así que no se duplicó tu intento.
        </Alert>
      )}

      {pending && (
        <Alert tone="info" title="Tus respuestas están en revisión" className="w-full text-left">
          Esta evaluación incluye preguntas abiertas que revisa una persona, por lo que todavía no hay
          un resultado.
        </Alert>
      )}

      {hasScore && !pending && (
        <div className="flex flex-col items-center gap-1">
          <Badge tone="primary">Resultado</Badge>
          <p className="text-3xl font-bold tabular-nums">{receipt.score}</p>
          {receipt.passed !== null && receipt.passed !== undefined && (
            <p className="text-sm text-muted-foreground">
              {receipt.passed ? 'Cumpliste el puntaje requerido.' : 'No alcanzaste el puntaje requerido.'}
            </p>
          )}
        </div>
      )}

      <dl className="w-full divide-y divide-border rounded-2xl border border-border text-left text-sm">
        <div className="flex items-center justify-between gap-3 p-3">
          <dt className="text-muted-foreground">Recibido</dt>
          <dd className="font-medium">{formatDateTime(receipt.receivedAt)}</dd>
        </div>
        {receipt.received > 0 && (
          <div className="flex items-center justify-between gap-3 p-3">
            <dt className="text-muted-foreground">Respuestas registradas</dt>
            <dd className="font-medium tabular-nums">{receipt.received}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 p-3">
          <dt className="text-muted-foreground">Identificador del intento</dt>
          <dd className="break-all font-mono text-xs">{receipt.attemptId}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Guarda el identificador solo si el equipo te lo pide. Ya puedes cerrar esta página: no hace
        falta crear una cuenta.
      </p>

      <Button asChild variant="glass">
        <Link href="/">
          <Home className="h-4 w-4" aria-hidden />
          Volver al inicio
        </Link>
      </Button>
    </GlassSurface>
  );
}
