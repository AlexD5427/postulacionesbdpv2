'use client';

import { useState } from 'react';
import { Clock, FileText, ListChecks, Play, ShieldCheck } from 'lucide-react';
import type { PublicAssessment } from '@/shared/types/domain';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Alert } from '@/shared/components/Alert';
import { answerableQuestions } from '../model/answers';

interface Props {
  assessment: PublicAssessment;
  participantName: string;
  starting?: boolean;
  errorMessage?: string;
  /** A recoverable draft was found for this code and version. */
  resumable?: boolean;
  onStart: () => void;
  onResume?: () => void;
  onCancel: () => void;
}

/**
 * Preflight: what the candidate is about to do, and the consent gate.
 *
 * `consent.requireConsent` and `consent.consentText` come from the assessment
 * policy, so the wording is the bank's, not ours — we never invent legal copy.
 * When consent is required the start button stays disabled until both boxes are
 * ticked; when it is not, the instructions box alone is required (a plain
 * "I read this" acknowledgement, which is not a legal statement).
 */
export function PreflightScreen({
  assessment,
  participantName,
  starting,
  errorMessage,
  resumable,
  onStart,
  onResume,
  onCancel,
}: Props) {
  const [readInstructions, setReadInstructions] = useState(false);
  const [acceptedConsent, setAcceptedConsent] = useState(false);

  const needsConsent = assessment.consent.requireConsent;
  const canStart = readInstructions && (!needsConsent || acceptedConsent);
  const questionTotal = answerableQuestions(assessment).length;

  return (
    <GlassSurface
      variant="elevated"
      radius="3xl"
      padding="lg"
      className="glass-sheen mx-auto flex w-full max-w-2xl flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Badge tone="primary" className="w-fit">
          {assessment.versionLabel || 'Evaluación'}
        </Badge>
        <h1 className="text-2xl font-bold md:text-3xl">{assessment.title}</h1>
        {assessment.description && (
          <p className="text-muted-foreground">{assessment.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Rendirás esta evaluación como <strong className="text-foreground">{participantName}</strong>.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-2xl border border-border p-3">
          <ListChecks className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <dt className="text-xs text-muted-foreground">Preguntas</dt>
            <dd className="font-semibold tabular-nums">{questionTotal}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border p-3">
          <FileText className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <dt className="text-xs text-muted-foreground">Secciones</dt>
            <dd className="font-semibold tabular-nums">{assessment.sections.length}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border p-3">
          <Clock className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <dt className="text-xs text-muted-foreground">Tiempo</dt>
            <dd className="font-semibold">
              {assessment.durationMinutes ? `${assessment.durationMinutes} min` : 'Sin límite'}
            </dd>
          </div>
        </div>
      </dl>

      {assessment.instructions && (
        <section className="flex flex-col gap-2" aria-labelledby="preflight-instructions">
          <h2 id="preflight-instructions" className="text-lg font-semibold">
            Instrucciones
          </h2>
          <p className="whitespace-pre-line text-muted-foreground">{assessment.instructions}</p>
        </section>
      )}

      <Alert tone="info" title="Cómo funciona">
        Puedes moverte entre secciones y tus respuestas se conservan mientras la pestaña siga abierta.
        No usamos cámara, micrófono ni grabación de pantalla, y cambiar de pestaña no se registra como
        una falta. El envío es único: al terminar verás un comprobante.
      </Alert>

      {resumable && onResume && (
        <Alert tone="warning" title="Tienes un intento en curso">
          Encontramos respuestas guardadas en esta pestaña para esta evaluación. Puedes continuarlo o
          empezar de nuevo.
          <span className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={onResume}>
              Continuar mi intento
            </Button>
          </span>
        </Alert>
      )}

      {errorMessage && (
        <Alert tone="danger" title="No pudimos iniciar la evaluación">
          {errorMessage}
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
          <Checkbox
            checked={readInstructions}
            disabled={starting}
            className="mt-0.5 shrink-0"
            onCheckedChange={(checked) => setReadInstructions(checked === true)}
          />
          <span>He leído las instrucciones y entiendo cómo se desarrolla esta evaluación.</span>
        </label>

        {needsConsent && (
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
            <Checkbox
              checked={acceptedConsent}
              disabled={starting}
              className="mt-0.5 shrink-0"
              onCheckedChange={(checked) => setAcceptedConsent(checked === true)}
            />
            {/* The bank's own consent text, rendered as plain text. */}
            <span className="whitespace-pre-line">
              {assessment.consent.consentText ||
                'Consiento el tratamiento de mis respuestas para este proceso de selección.'}
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" loading={starting} disabled={!canStart || starting} onClick={onStart}>
          <Play className="h-5 w-5" aria-hidden />
          Comenzar evaluación
        </Button>
        <Button variant="ghost" disabled={starting} onClick={onCancel}>
          Volver
        </Button>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
        Nunca verás ni recibirás las respuestas correctas: la revisión la hace el equipo del banco.
      </p>
    </GlassSurface>
  );
}
