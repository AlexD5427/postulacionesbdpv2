'use client';

/**
 * Comprobante: la prueba de que el envío quedó registrado.
 *
 * ── La regla que gobierna esta pantalla ──────────────────────────────────────
 * **No se muestra nada que el servidor no haya dicho.** El backend decide cuánto
 * revela según `visibilidadResultado`: con `solo_envio` o `nada` no manda la nota, y
 * el comprobante llega sin ella. La tentación es pintar un `0` donde falta el campo,
 * y sería mentirle a alguien sobre su propia evaluación —además de un `0` que el
 * revisor nunca dijo—. Aquí, si no hay nota, no hay nota, y se explica por qué.
 *
 * Lo mismo con la calificación pendiente: cuando hay preguntas abiertas, la nota
 * automática es incompleta por definición. Se dice, en lugar de mostrar una parcial
 * que alguien leería como definitiva.
 *
 * ── Por qué el identificador se puede copiar ────────────────────────────────
 * Porque es lo único que la persona tiene si algo hay que reclamar. Un identificador
 * que hay que transcribir a mano de una pantalla se transcribe mal.
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Clock,
  Hourglass,
  Timer,
} from 'lucide-react';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import type { ComprobanteIntento } from '../domain/contract';
import { formatearReloj } from './pieces';

interface Props {
  comprobante: ComprobanteIntento;
  demostracion: boolean;
}

/** Sello animado: el trazo del visto se dibuja una vez, con CSS. */
function Sello({ aprobado }: { aprobado: boolean | null | undefined }) {
  const reducido = useReducedMotion();
  const fondo =
    aprobado === false
      ? 'rgb(var(--color-danger))'
      : aprobado === true
        ? 'rgb(var(--color-success))'
        // Lleva el visto en blanco encima: hace falta el tono con tinta.
        : 'rgb(var(--ev-accent-ink))';

  return (
    <motion.span
      className="mx-auto grid h-20 w-20 place-items-center rounded-3xl"
      style={{ backgroundColor: fondo }}
      initial={reducido ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-10 w-10">
        <path
          className="ev-seal-check"
          d="M8 16.5l5.5 5.5L24 11"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.span>
  );
}

export function ReceiptScreen({ comprobante, demostracion }: Props) {
  const reducido = useReducedMotion();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(comprobante.intentoId);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles el identificador sigue visible y seleccionable:
      // no hay nada que arreglar y un error en pantalla sólo asustaría.
    }
  };

  const tieneNota = comprobante.nota !== undefined && comprobante.nota !== null;
  const expirado = comprobante.estado === 'expirado';

  return (
    <motion.div
      className="mx-auto w-full max-w-xl"
      initial={reducido ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
    >
      <GlassSurface
        variant="elevated"
        radius="3xl"
        padding="lg"
        className="glass-sheen flex flex-col gap-6 text-center"
      >
        <Sello aprobado={comprobante.aprobado} />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {expirado ? 'Evaluación cerrada por tiempo' : 'Evaluación enviada'}
          </h1>
          <p className="text-muted-foreground">
            {comprobante.repetido
              ? 'Tu envío ya estaba registrado. No se creó ningún duplicado.'
              : comprobante.envioAutomatico
                ? 'Se envió automáticamente al agotarse el tiempo, con las respuestas registradas hasta ese momento.'
                : 'Tus respuestas quedaron registradas correctamente.'}
          </p>
          {comprobante.evaluacion && (
            <p className="text-sm font-medium">{comprobante.evaluacion}</p>
          )}
        </div>

        {/* Comprobante copiable */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identificador de tu intento
          </span>
          <div className="flex items-center justify-center gap-2">
            <code className="ev-tabular select-all break-all text-sm font-semibold">
              {comprobante.intentoId}
            </code>
            <button
              type="button"
              onClick={() => void copiar()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Copiar el identificador del intento"
            >
              {copiado ? (
                <Check className="h-4 w-4 text-success" aria-hidden />
              ) : (
                <ClipboardCopy className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          <span aria-live="polite" className="sr-only">
            {copiado ? 'Identificador copiado.' : ''}
          </span>
          <p className="text-xs text-muted-foreground">
            Guárdalo. Es la referencia de tu intento si necesitas consultar algo con el equipo de
            Talento Humano.
          </p>
        </div>

        {/* Datos que el servidor sí confirmó */}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {comprobante.respuestasRegistradas > 0 && (
            <div className="flex flex-col gap-0.5 rounded-2xl border border-border p-3">
              <dt className="text-xs text-muted-foreground">Respuestas registradas</dt>
              <dd className="ev-tabular text-lg font-bold">{comprobante.respuestasRegistradas}</dd>
            </div>
          )}
          {comprobante.segundosUsados > 0 && (
            <div className="flex flex-col gap-0.5 rounded-2xl border border-border p-3">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="h-3 w-3" aria-hidden />
                Tiempo empleado
              </dt>
              <dd className="ev-tabular text-lg font-bold">
                {formatearReloj(comprobante.segundosUsados)}
              </dd>
            </div>
          )}
        </dl>

        {comprobante.calificacionPendiente && (
          <p className="flex items-start gap-2 rounded-2xl border border-info/40 bg-info/10 p-3 text-left text-sm">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
            <span>
              Tu evaluación incluye preguntas que revisa una persona del equipo evaluador, así que la
              nota final todavía no está disponible. Te contactarán por los medios del proceso.
            </span>
          </p>
        )}

        {tieneNota && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tu resultado
            </span>
            <span className="ev-tabular text-5xl font-bold">{comprobante.nota}</span>
            {comprobante.aprobado !== undefined && comprobante.aprobado !== null && (
              <span
                className={`rounded-full px-4 py-1 text-sm font-bold ${
                  comprobante.aprobado
                    ? 'bg-success/15 text-success'
                    : 'bg-danger/15 text-danger'
                }`}
              >
                {comprobante.aprobado ? 'Aprobado' : 'No aprobado'}
              </span>
            )}
            {comprobante.correctas !== undefined && (
              <span className="text-xs text-muted-foreground">
                {comprobante.correctas} correctas · {comprobante.incorrectas ?? 0} incorrectas ·{' '}
                {comprobante.sinResponder ?? 0} sin responder
              </span>
            )}
          </div>
        )}

        {!tieneNota && !comprobante.calificacionPendiente && (
          <p className="flex items-start gap-2 rounded-2xl border border-border p-3 text-left text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {/* Honestidad explícita: el resultado no se muestra porque el banco lo
                configuró así, no porque falle nada. */}
            <span>
              El resultado de esta evaluación no se muestra aquí. El equipo de Talento Humano lo
              revisa y se comunica contigo por los medios del proceso.
            </span>
          </p>
        )}

        {demostracion && (
          <p className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
            Este comprobante es de <span className="font-semibold">demostración</span>: no se guardó
            nada en los sistemas del banco.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="glass">
            <Link href="/jobs">
              Ver convocatorias abiertas
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Ya puedes cerrar esta ventana.</p>
      </GlassSurface>
    </motion.div>
  );
}
