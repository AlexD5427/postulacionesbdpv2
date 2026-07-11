'use client';

import { useState } from 'react';
import { ShieldCheck, Clock, Keyboard, Save, LifeBuoy, CameraOff } from 'lucide-react';
import type { AssessmentDefinition } from '@/shared/types/domain';
import { Card, CardTitle } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Badge } from '@/design-system/primitives/Badge';
import { Alert } from '@/shared/components/Alert';

/**
 * Transparent assessment preflight + consent.
 *
 * The monitoring disclosure uses the exact calm, corporate wording mandated by
 * the spec (§18.1). Two explicit checkboxes gate the start. No dark patterns,
 * no hidden collection. Wording is flagged as pending bank legal approval.
 */
export function AssessmentConsentScreen({
  definition,
  onStart,
  starting,
}: {
  definition: AssessmentDefinition;
  onStart: () => void;
  starting: boolean;
}) {
  const [readInstructions, setReadInstructions] = useState(false);
  const [consentMonitoring, setConsentMonitoring] = useState(false);
  const canStart = readInstructions && consentMonitoring;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{definition.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Versión {definition.version}</Badge>
          <Badge tone="neutral">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            ~{definition.estimatedMinutes} min
          </Badge>
          {definition.timing.mode === 'total' && definition.timing.totalMinutes && (
            <Badge tone="warning">Tiempo límite: {definition.timing.totalMinutes} min</Badge>
          )}
        </div>
      </div>

      <Alert tone="info" title="Antes de comenzar">
        {definition.disclaimer}
      </Alert>

      <Card className="gap-4">
        <CardTitle className="text-lg">Instrucciones</CardTitle>
        <p className="text-muted-foreground">{definition.instructions}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <Keyboard className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {definition.accessibility.keyboardInstructions}
          </li>
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <Save className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {definition.attemptPolicy.allowResume
              ? 'Tus respuestas se guardan automáticamente; puedes pausar y retomar.'
              : 'Completa la evaluación en una sola sesión.'}
          </li>
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            Duración estimada: {definition.estimatedMinutes} minutos.
          </li>
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            No se activa cámara ni micrófono, y no se graba tu pantalla.
          </li>
        </ul>
      </Card>

      <Card className="gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          Información técnica que se registra
        </CardTitle>
        <p className="text-muted-foreground">
          Para proteger la integridad y la continuidad de esta evaluación, la plataforma registra
          información técnica limitada durante tu intento, incluyendo la hora de inicio y de
          finalización, el tiempo dedicado a las preguntas, las interrupciones de conexión y si la
          página de la evaluación se oculta o se vuelve visible. Esta información se revisa solo
          cuando es necesario y, por sí sola, no se utiliza para determinar el resultado de tu
          postulación. La plataforma no activa tu cámara ni tu micrófono y no graba tu pantalla. Si
          necesitas una adaptación de accesibilidad o experimentas un problema técnico, contáctanos
          antes de continuar.
        </p>
        <p className="text-xs text-muted-foreground">
          Referencia de política: {definition.monitoringPolicyVersion}. Redacción de ejemplo sujeta a
          aprobación legal y de privacidad del banco.
        </p>
      </Card>

      <GlassSurface variant="subtle" radius="2xl" padding="md" className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={readInstructions} onCheckedChange={(v) => setReadInstructions(v === true)} className="mt-0.5" />
          He leído y comprendido las instrucciones de la evaluación.
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={consentMonitoring} onCheckedChange={(v) => setConsentMonitoring(v === true)} className="mt-0.5" />
          Consiento la recopilación de la información técnica descrita para la integridad y el soporte
          de la evaluación.
        </label>
      </GlassSurface>

      <Alert tone="info" title="¿Necesitas ayuda o una adaptación?">
        Escríbenos a{' '}
        <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${definition.accessibility.accommodationsContact}`}>
          {definition.accessibility.accommodationsContact}
        </a>
        . Solicitar una adaptación no afecta de ninguna manera tu postulación.
      </Alert>

      <div className="flex items-center gap-3">
        <Button size="lg" onClick={onStart} disabled={!canStart} loading={starting}>
          <LifeBuoy className="h-5 w-5" aria-hidden />
          Comenzar evaluación
        </Button>
        {!canStart && <span className="text-sm text-muted-foreground">Marca ambas casillas para continuar.</span>}
      </div>
    </div>
  );
}
