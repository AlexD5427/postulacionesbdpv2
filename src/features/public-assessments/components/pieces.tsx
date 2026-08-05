'use client';

/**
 * Piezas visuales compartidas del runner.
 *
 * Están aquí y no en `@/design-system` a propósito: son específicas de una prueba
 * cronometrada y el módulo tiene que poder retirarse sin dejar primitivas huérfanas
 * en el sistema de diseño. Lo que sí se reutiliza del sistema es el material
 * (Liquid Glass), los tokens y los primitivos generales.
 */

import { motion } from 'framer-motion';
import { AlertTriangle, Check, FlaskConical, ShieldCheck } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import type { PoliticaIntegridad } from '../domain/contract';

/* ========================================================================== */
/* Reloj                                                                      */
/* ========================================================================== */

/** `mm:ss`, o `h:mm:ss` cuando la prueba pasa de una hora. */
export function formatearReloj(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;
  const dosDigitos = (valor: number) => String(valor).padStart(2, '0');
  return horas > 0
    ? `${horas}:${dosDigitos(minutos)}:${dosDigitos(resto)}`
    : `${dosDigitos(minutos)}:${dosDigitos(resto)}`;
}

/** Lectura del tiempo en palabras, para quien usa un lector de pantalla. */
export function relojEnPalabras(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  if (minutos === 0) return `${resto} segundos restantes`;
  if (resto === 0) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} restantes`;
  return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} y ${resto} segundos restantes`;
}

type NivelReloj = 'normal' | 'atencion' | 'critico';

function nivelDe(restantes: number, total: number | null): NivelReloj {
  if (restantes <= 60) return 'critico';
  if (total !== null && total > 0 && restantes / total <= 0.15) return 'atencion';
  if (restantes <= 300) return 'atencion';
  return 'normal';
}

/**
 * Aro del temporizador.
 *
 * El arco se dibuja con `stroke-dashoffset` sobre un círculo, así que el navegador
 * lo interpola sin JavaScript por fotograma: un `setInterval` que repinta React
 * cada segundo ya es suficiente carga en una pestaña que además está registrando
 * eventos de integridad.
 *
 * ── Accesibilidad ────────────────────────────────────────────────────────────
 * El aro es decorativo (`aria-hidden`) y el tiempo se anuncia por texto. **No** es
 * una región `aria-live`: un anuncio por segundo convertiría un lector de pantalla
 * en un obstáculo. Se anuncia al entrar en los últimos cinco minutos y en el último
 * minuto, que es cuando la información cambia una decisión.
 */
export function TimerRing({
  restantes,
  totalSegundos,
  className,
}: {
  restantes: number;
  totalSegundos: number | null;
  className?: string;
}) {
  const nivel = nivelDe(restantes, totalSegundos);
  const radio = 22;
  const perimetro = 2 * Math.PI * radio;
  const fraccion =
    totalSegundos && totalSegundos > 0 ? Math.min(1, Math.max(0, restantes / totalSegundos)) : 1;

  return (
    <div
      className={cn('ev-timer flex items-center gap-2', className)}
      data-nivel={nivel}
      data-testid="ev-timer"
    >
      <span className="relative grid h-11 w-11 shrink-0 place-items-center" aria-hidden>
        <svg viewBox="0 0 52 52" className="h-11 w-11 -rotate-90">
          <circle
            className="ev-timer-track"
            cx="26"
            cy="26"
            r={radio}
            fill="none"
            strokeWidth="3.5"
          />
          <circle
            className="ev-timer-arc"
            cx="26"
            cy="26"
            r={radio}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={perimetro}
            strokeDashoffset={perimetro * (1 - fraccion)}
          />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="ev-tabular text-lg font-bold">{formatearReloj(restantes)}</span>
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          {nivel === 'critico' ? 'último minuto' : 'restante'}
        </span>
      </span>
      {/* Lectura textual: fuera de la vista, pero disponible al navegar. */}
      <span className="sr-only">{relojEnPalabras(restantes)}</span>
    </div>
  );
}

/* ========================================================================== */
/* Progreso                                                                   */
/* ========================================================================== */

export function ProgressMeter({
  respondidas,
  total,
  className,
}: {
  respondidas: number;
  total: number;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const porcentaje = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
        <span className="ev-tabular">{respondidas}</span> de{' '}
        <span className="ev-tabular">{total}</span> respondidas
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={respondidas}
        aria-label="Progreso de la evaluación"
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgb(var(--ev-accent)), rgb(var(--ev-accent-soft)))',
          }}
          initial={false}
          animate={{ width: `${porcentaje}%` }}
          transition={reducido ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 24 }}
        />
      </div>
      <span className="ev-tabular shrink-0 text-xs font-semibold">{porcentaje}%</span>
    </div>
  );
}

/* ========================================================================== */
/* Navegador de preguntas                                                     */
/* ========================================================================== */

export interface EntradaNavegador {
  id: string;
  numero: number;
  etiqueta: string;
  respondida: boolean;
  obligatoriaPendiente: boolean;
  /** `false` cuando la pregunta está en otra página del cuestionario. */
  alcanzable: boolean;
}

/**
 * Tira de pastillas numeradas.
 *
 * Resuelve el problema más real de un cuestionario largo: saber qué falta sin
 * recorrerlo. El estado se comunica con **tres** señales a la vez (color, forma del
 * contenido y texto accesible), porque un candidato con daltonismo tiene el mismo
 * derecho a ver de un vistazo qué le queda pendiente.
 */
export function QuestionNavigator({
  entradas,
  actual,
  onIr,
  className,
}: {
  entradas: EntradaNavegador[];
  actual: string | null;
  onIr: (id: string) => void;
  className?: string;
}) {
  if (entradas.length === 0) return null;

  return (
    <nav className={cn('ev-scroll-x flex gap-1.5 pb-1', className)} aria-label="Ir a una pregunta">
      {entradas.map((entrada) => {
        const estado = entrada.respondida
          ? 'respondida'
          : entrada.obligatoriaPendiente
            ? 'pendiente'
            : 'sin-responder';
        const situacion = entrada.respondida
          ? 'respondida'
          : entrada.obligatoriaPendiente
            ? 'obligatoria sin responder'
            : 'sin responder';
        return (
          <button
            key={entrada.id}
            type="button"
            className="ev-pill"
            data-estado={estado}
            data-actual={entrada.id === actual}
            disabled={!entrada.alcanzable}
            onClick={() => onIr(entrada.id)}
            aria-label={`Pregunta ${entrada.numero}: ${situacion}. ${entrada.etiqueta}`}
            aria-current={entrada.id === actual ? 'true' : undefined}
          >
            {entrada.respondida ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <span aria-hidden>{entrada.numero}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ========================================================================== */
/* Avisos permanentes                                                         */
/* ========================================================================== */

/**
 * Banda del modo demostración.
 *
 * Permanente y bien visible. Un módulo que simula guardar un intento en un proceso
 * de selección real y no lo dice sería la peor mentira posible del producto.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm"
    >
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
      <p>
        <span className="font-semibold">Modo demostración.</span> Esta evaluación es un ejemplo
        local: <span className="font-semibold">nada de lo que respondas se guarda</span> ni llega al
        Banco de Desarrollo Productivo.
      </p>
    </div>
  );
}

/**
 * Aviso de integridad, con la lista literal de lo que se registra.
 *
 * Se muestra ANTES de empezar, nunca durante. Dos razones, y la segunda es la que
 * de verdad manda: una vigilancia silenciosa no es aceptable, y una vigilancia que
 * no se anunció **no sirve como evidencia** en un proceso de selección impugnable.
 */
export function IntegrityNotice({ politica }: { politica: PoliticaIntegridad }) {
  const registra: string[] = [];
  if (politica.registrarCambioPestana) {
    registra.push('cuándo cambias de pestaña o de ventana, y cuánto tiempo estás fuera');
  }
  if (politica.registrarCopiaPegado) {
    registra.push('si copias o pegas texto — solo la cantidad de caracteres, nunca su contenido');
  }
  if (politica.registrarTiempos) {
    registra.push('cuánto tiempo dedicas a cada pregunta y las pausas largas');
  }
  if (politica.registrarNavegacion) registra.push('el orden en el que recorres las preguntas');

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
        Qué se registra durante la evaluación
      </h3>

      {registra.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          {registra.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Esta evaluación no registra ninguna señal de comportamiento.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">No se usa</span> cámara, micrófono,
        grabación de pantalla, ubicación ni ningún permiso del navegador. No se leen otras
        pestañas ni el contenido de lo que copias. El registro acompaña tus respuestas para que
        quien las revise tenga contexto, no para descalificarte de forma automática.
      </p>

      {politica.bloquearPegado && (
        <p className="flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          En esta evaluación <span className="font-semibold">pegar texto está desactivado</span>.
          Escribe tus respuestas directamente.
        </p>
      )}
    </section>
  );
}

/* ========================================================================== */
/* Pastillas de metadatos                                                     */
/* ========================================================================== */

export function MetaPill({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {children}
    </span>
  );
}
