'use client';

/**
 * Revisión antes de enviar.
 *
 * ── Por qué un diálogo y no un envío directo ─────────────────────────────────
 * Enviar es irreversible: el intento queda `enviado` y el backend no admite más
 * cambios. Un botón que dispara algo irreversible sin confirmación acabará
 * disparándose por error, y la persona afectada no puede deshacerlo.
 *
 * ── Por qué la lista de pendientes es navegable ─────────────────────────────
 * «Faltan 3 preguntas obligatorias» informa y no ayuda: en un cuestionario de
 * cuarenta preguntas, encontrar cuáles es el trabajo. Cada pendiente es un botón que
 * cierra el diálogo, desplaza hasta la pregunta y le pone el foco.
 *
 * ── Y aun así se puede enviar incompleto ────────────────────────────────────
 * Deliberadamente. Quien decide si vale la pena entregar una prueba incompleta es
 * quien la rinde, no el formulario: bloquear el envío por una obligatoria en blanco
 * significa que, a diez segundos del cierre, se pierde todo lo demás. El servidor la
 * contará como «sin responder», que es exactamente lo que pasó.
 */

import { AlertTriangle, ArrowRight, CircleDashed, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/design-system/primitives/Dialog';
import { Button } from '@/design-system/primitives/Button';

export interface PendienteRevision {
  id: string;
  numero: number;
  etiqueta: string;
}

interface Props {
  abierto: boolean;
  respondidas: number;
  total: number;
  obligatoriasPendientes: PendienteRevision[];
  opcionalesOmitidas: PendienteRevision[];
  enviando: boolean;
  onCerrar: () => void;
  onIrAPregunta: (id: string) => void;
  onConfirmar: () => void;
}

function ListaPendientes({
  titulo,
  tono,
  entradas,
  onIr,
}: {
  titulo: string;
  tono: 'obligatoria' | 'opcional';
  entradas: PendienteRevision[];
  onIr: (id: string) => void;
}) {
  if (entradas.length === 0) return null;
  const Icono = tono === 'obligatoria' ? AlertTriangle : CircleDashed;

  return (
    <section className="flex flex-col gap-2">
      <h3
        className={`flex items-center gap-2 text-sm font-semibold ${
          tono === 'obligatoria' ? 'text-warning' : 'text-muted-foreground'
        }`}
      >
        <Icono className="h-4 w-4" aria-hidden />
        {titulo}
      </h3>
      <ul className="flex list-none flex-col gap-1">
        {entradas.slice(0, 12).map((entrada) => (
          <li key={entrada.id}>
            <button
              type="button"
              onClick={() => onIr(entrada.id)}
              className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <span className="ev-tabular shrink-0 font-semibold text-muted-foreground">
                {entrada.numero}
              </span>
              <span className="min-w-0 flex-1 truncate">{entrada.etiqueta}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
        {entradas.length > 12 && (
          <li className="px-3 text-xs text-muted-foreground">
            …y {entradas.length - 12} más.
          </li>
        )}
      </ul>
    </section>
  );
}

export function ReviewDialog({
  abierto,
  respondidas,
  total,
  obligatoriasPendientes,
  opcionalesOmitidas,
  enviando,
  onCerrar,
  onIrAPregunta,
  onConfirmar,
}: Props) {
  const completa = obligatoriasPendientes.length === 0 && opcionalesOmitidas.length === 0;

  return (
    <Dialog open={abierto} onOpenChange={(estado) => !estado && onCerrar()}>
      <DialogContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5 pr-8">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {completa ? '¿Enviar tu evaluación?' : 'Revisa antes de enviar'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Has respondido <span className="ev-tabular font-semibold text-foreground">{respondidas}</span> de{' '}
            <span className="ev-tabular font-semibold text-foreground">{total}</span> preguntas. Una
            vez enviada no podrás modificarla.
          </DialogDescription>
        </div>

        {obligatoriasPendientes.length > 0 && (
          <ListaPendientes
            titulo={`${obligatoriasPendientes.length} ${
              obligatoriasPendientes.length === 1
                ? 'pregunta obligatoria sin responder'
                : 'preguntas obligatorias sin responder'
            }`}
            tono="obligatoria"
            entradas={obligatoriasPendientes}
            onIr={onIrAPregunta}
          />
        )}

        {opcionalesOmitidas.length > 0 && (
          <ListaPendientes
            titulo={`${opcionalesOmitidas.length} ${
              opcionalesOmitidas.length === 1 ? 'pregunta opcional omitida' : 'preguntas opcionales omitidas'
            }`}
            tono="opcional"
            entradas={opcionalesOmitidas}
            onIr={onIrAPregunta}
          />
        )}

        {completa && (
          <p className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
            Respondiste todas las preguntas. Puedes enviar con tranquilidad.
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Seguir respondiendo
          </Button>
          <Button onClick={onConfirmar} loading={enviando} disabled={enviando}>
            <Send className="h-4 w-4" aria-hidden />
            Enviar ahora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
