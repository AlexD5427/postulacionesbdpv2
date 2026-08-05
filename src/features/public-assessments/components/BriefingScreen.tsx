'use client';

/**
 * Antesala: lo que hay que saber antes de que el reloj empiece a contar.
 *
 * ── Por qué existe una pantalla intermedia ───────────────────────────────────
 * Porque el temporizador arranca en el servidor al crear el intento, y crear el
 * intento en el mismo clic que abre la evaluación significaría que alguien pierde
 * dos minutos leyendo las instrucciones **con el reloj corriendo**. `openAssessment`
 * no crea nada y no trae preguntas; `startAttempt` sí. Separarlos en dos pantallas es
 * lo que hace que el tiempo empiece cuando la persona dice que está lista.
 *
 * Aquí se muestra, además, todo lo que hay que declarar antes y no después: qué se
 * registra durante la prueba, cuántos intentos hay y el consentimiento que el banco
 * definió en el ATS —su texto literal, nunca uno inventado aquí—.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileQuestion,
  Hourglass,
  ListChecks,
  Play,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { Button } from '@/design-system/primitives/Button';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Alert } from '@/shared/components/Alert';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import type { PortadaPublica } from '../domain/contract';
import { esIndisponibilidadTransitoria } from '../api/errors';
import { docRicoVacioP } from '../domain/rich-text';
import { RichText } from './RichText';
import { DemoBanner, IntegrityNotice, MetaPill } from './pieces';

interface Props {
  portada: PortadaPublica;
  nombre: string;
  numeroIdentificador: string;
  iniciando: boolean;
  error?: { mensaje: string; pista?: string } | null;
  demostracion: boolean;
  onComenzar: (consentimiento: boolean) => void;
  onVolver: () => void;
  onReintentar: () => void;
}

/** Fecha legible sin depender de la zona horaria del servidor. */
function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-BO', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BriefingScreen({
  portada,
  nombre,
  numeroIdentificador,
  iniciando,
  error,
  demostracion,
  onComenzar,
  onVolver,
  onReintentar,
}: Props) {
  const reducido = useReducedMotion();
  const [consentimiento, setConsentimiento] = useState(false);
  const [leido, setLeido] = useState(false);

  /* ------------------------- Evaluación no disponible -------------------- */

  if (!portada.disponible) {
    const transitoria = esIndisponibilidadTransitoria(portada.motivo);
    return (
      <GlassSurface
        variant="elevated"
        radius="3xl"
        padding="lg"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center"
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
          <Hourglass className="h-7 w-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{portada.titulo || 'Evaluación'}</h1>
          {/* El mensaje viene del backend, que lo redactó para el candidato
              (`EV_MOTIVO_TEXTO`). Sustituirlo por una frase genérica perdería la
              única información útil que tiene esta pantalla. */}
          <p className="text-muted-foreground">{portada.mensaje}</p>
          {portada.ventanaFin && (
            <p className="text-sm text-muted-foreground">
              Plazo: hasta el {fechaLegible(portada.ventanaFin)}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {transitoria && (
            <Button variant="glass" onClick={onReintentar}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Volver a comprobar
            </Button>
          )}
          <Button variant="outline" onClick={onVolver}>
            Usar otro número identificador
          </Button>
        </div>
      </GlassSurface>
    );
  }

  /* ------------------------------- Antesala ------------------------------ */

  const exigeConsentimiento = portada.participante?.requiereConsentimiento === true;
  const textoConsentimiento = portada.participante?.textoConsentimiento ?? '';
  const puedeEmpezar = leido && (!exigeConsentimiento || consentimiento) && !iniciando;
  const intentos = portada.intentosMaximos ?? 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {demostracion && <DemoBanner />}

      <motion.div
        initial={reducido ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.2, 0, 0, 1] }}
      >
        <GlassSurface
          variant="elevated"
          radius="3xl"
          padding="lg"
          className="glass-sheen flex flex-col gap-6"
        >
          <header className="flex flex-col gap-3">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'rgb(var(--ev-accent) / 0.14)',
                color: 'rgb(var(--ev-accent-ink))',
              }}
            >
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Evaluación del proceso de selección
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{portada.titulo}</h1>
            {portada.descripcion && (
              <p className="text-muted-foreground">{portada.descripcion}</p>
            )}
          </header>

          <ul className="flex list-none flex-wrap gap-2">
            {portada.totalPreguntas !== undefined && portada.totalPreguntas > 0 && (
              <li>
                <MetaPill icon={FileQuestion}>{portada.totalPreguntas} preguntas</MetaPill>
              </li>
            )}
            <li>
              <MetaPill icon={Clock}>
                {portada.duracionMinutos
                  ? `${portada.duracionMinutos} minutos`
                  : 'Sin límite de tiempo'}
              </MetaPill>
            </li>
            <li>
              <MetaPill icon={RotateCcw}>
                {intentos === 1 ? 'Un solo intento' : `${intentos} intentos`}
              </MetaPill>
            </li>
            {portada.versionEtiqueta && (
              <li>
                <MetaPill icon={Tag}>{portada.versionEtiqueta}</MetaPill>
              </li>
            )}
            {portada.ventanaFin && (
              <li>
                <MetaPill icon={CalendarClock}>Hasta el {fechaLegible(portada.ventanaFin)}</MetaPill>
              </li>
            )}
          </ul>

          {/* Confirmación de identidad: la última oportunidad de corregir un carnet
              mal escrito antes de que el intento quede atribuido a otra persona. */}
          <section className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4">
            <h2 className="text-sm font-semibold">Vas a rendirla como</h2>
            <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{nombre}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">N.º identificador</dt>
                <dd className="ev-tabular font-medium">{numeroIdentificador}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={onVolver}
              className="w-fit text-xs font-medium text-primary underline underline-offset-4"
            >
              No soy yo, corregir mis datos
            </button>
          </section>

          {!docRicoVacioP(portada.instrucciones) && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Instrucciones
              </h2>
              <div className="rounded-2xl border border-border p-4">
                <RichText doc={portada.instrucciones} />
              </div>
            </section>
          )}

          {portada.integridad && <IntegrityNotice politica={portada.integridad} />}

          {portada.duracionMinutos ? (
            <Alert tone="info" title="El tiempo empieza cuando pulses «Comenzar»">
              Tendrás {portada.duracionMinutos} minutos. El reloj lo controla el servidor, así que
              recargar la página no lo reinicia ni te quita tiempo: si algo se corta, vuelve a
              entrar con tu número identificador y continuarás donde lo dejaste.
            </Alert>
          ) : (
            <Alert tone="info" title="Sin límite de tiempo">
              Puedes tomarte el tiempo que necesites. Tus respuestas se guardan de forma automática
              mientras avanzas.
            </Alert>
          )}

          {error && (
            <Alert tone="danger" title="No pudimos comenzar la evaluación">
              {error.mensaje}
              {error.pista ? <span className="mt-1 block text-xs">{error.pista}</span> : null}
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3.5 text-sm transition-colors hover:bg-muted/40">
              <Checkbox
                checked={leido}
                disabled={iniciando}
                className="mt-0.5 shrink-0"
                onCheckedChange={(marcado) => setLeido(marcado === true)}
              />
              <span>He leído las instrucciones y entiendo cómo se desarrolla la evaluación.</span>
            </label>

            <AnimatePresence initial={false}>
              {exigeConsentimiento && (
                <motion.label
                  initial={reducido ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reducido ? undefined : { opacity: 0, height: 0 }}
                  className="flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border border-border p-3.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    checked={consentimiento}
                    disabled={iniciando}
                    className="mt-0.5 shrink-0"
                    onCheckedChange={(marcado) => setConsentimiento(marcado === true)}
                  />
                  {/* Texto literal del ATS: la redacción legal la decide el banco. */}
                  <span>{textoConsentimiento || 'Acepto el consentimiento informado.'}</span>
                </motion.label>
              )}
            </AnimatePresence>

            <Button
              size="lg"
              loading={iniciando}
              disabled={!puedeEmpezar}
              onClick={() => onComenzar(consentimiento)}
            >
              <Play className="h-5 w-5" aria-hidden />
              Comenzar la evaluación
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
              Al terminar recibirás un comprobante con el identificador de tu intento.
            </p>
          </div>
        </GlassSurface>
      </motion.div>
    </div>
  );
}
