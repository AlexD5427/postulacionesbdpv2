'use client';

/**
 * Una pregunta —o un bloque de contenido— tal como la ve el candidato.
 *
 * ── Qué comunica la tarjeta, y por qué de tres formas a la vez ──────────────
 * El estado (sin responder · respondida · obligatoria pendiente) se ve en el canto
 * de luz del borde, en el icono junto al número y en el texto accesible. Tres
 * señales para lo mismo puede parecer redundante hasta que se piensa en quién lee:
 * alguien con daltonismo no distingue el canto, alguien con un lector de pantalla
 * no ve ninguno de los dos, y alguien con prisa sólo mira el color. Cada señal
 * cubre a una persona distinta.
 *
 * ── La visita se detecta, no se supone ─────────────────────────────────────
 * `IntersectionObserver` marca la pregunta como vista cuando entra de verdad en la
 * pantalla. De ahí sale el tiempo por pregunta que el revisor ve en el informe.
 * Contar como «vista» toda pregunta cargada convertiría ese dato en ruido: en una
 * navegación libre se cargan todas de golpe.
 */

import { useEffect, useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import type { PreguntaPublica } from '../domain/contract';
import { enunciadoLoDibujaElControl, type ValorRespuesta } from '../domain/answers';
import { esContenido, esTipoConocido, especificacionDe } from '../domain/question-types';
import { docRicoVacioP } from '../domain/rich-text';
import { RichText } from './RichText';
import { AnswerControl } from './AnswerControl';

export interface QuestionCardProps {
  pregunta: PreguntaPublica;
  /** Número visible; `0` cuando el autor desactivó la numeración o es contenido. */
  numero: number;
  /** Posición en la página, sólo para escalonar la entrada. */
  indice: number;
  valor: ValorRespuesta | undefined;
  respondida: boolean;
  /** Mensaje de validación local, ya calculado por el orquestador. */
  problema: string | null;
  /** `true` cuando ya se pulsó «Enviar» y hay que señalar lo que falta. */
  mostrarProblemas: boolean;
  bloqueado: boolean;
  bloquearPegado: boolean;
  onChange: (valor: ValorRespuesta) => void;
  onVista: () => void;
  onPegar: (caracteres: number) => void;
  onCopiar: () => void;
}

/* ------------------------------ Bloques de contenido ---------------------- */

const TONO_AVISO = {
  info: 'border-info/40 bg-info/10',
  exito: 'border-success/40 bg-success/10',
  aviso: 'border-warning/40 bg-warning/10',
  peligro: 'border-danger/40 bg-danger/10',
} as const;

function BloqueContenido({ pregunta }: { pregunta: PreguntaPublica }) {
  const config = pregunta.configuracion;

  switch (pregunta.tipo) {
    case 'contenido_separador':
      return <hr className="my-2 border-border" />;

    case 'contenido_aviso': {
      const tono = String(config.tonoAviso ?? 'info');
      const clase = TONO_AVISO[tono as keyof typeof TONO_AVISO] ?? TONO_AVISO.info;
      return (
        <div className={cn('flex items-start gap-3 rounded-2xl border p-4', clase)}>
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden />
          <RichText doc={pregunta.enunciado} />
        </div>
      );
    }

    case 'contenido_imagen': {
      const url = String(config.imagenUrl ?? pregunta.medios?.imagenUrl ?? '');
      if (!url) return null;
      return (
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={pregunta.medios?.textoAlternativo ?? pregunta.accesibilidad?.etiquetaAria ?? ''}
            className="max-h-96 w-full rounded-2xl border border-border object-contain"
          />
          {!docRicoVacioP(pregunta.enunciado) && (
            <figcaption className="text-sm text-muted-foreground">
              <RichText doc={pregunta.enunciado} compacto />
            </figcaption>
          )}
        </figure>
      );
    }

    case 'contenido_video': {
      const url = String(config.videoUrl ?? pregunta.medios?.videoUrl ?? '');
      if (!url) return null;
      // Se ofrece como enlace en lugar de incrustarlo: un `<iframe>` de un tercero
      // exigiría abrir `frame-src` en la política de seguridad para un dominio que
      // el portal no controla, y un vídeo de apoyo no justifica ese agujero.
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
        >
          Ver el video de apoyo
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      );
    }

    case 'contenido_recurso': {
      const url = String(config.enlaceUrl ?? '');
      const texto = String(config.enlaceTexto ?? 'Abrir el recurso');
      if (!url) return <RichText doc={pregunta.enunciado} />;
      return (
        <div className="flex flex-col gap-2">
          <RichText doc={pregunta.enunciado} />
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {texto}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      );
    }

    default:
      // Título y párrafo: el propio texto enriquecido ya trae su jerarquía.
      return <RichText doc={pregunta.enunciado} />;
  }
}

/* --------------------------------- La tarjeta ----------------------------- */

export function QuestionCard({
  pregunta,
  numero,
  indice,
  valor,
  respondida,
  problema,
  mostrarProblemas,
  bloqueado,
  bloquearPegado,
  onChange,
  onVista,
  onPegar,
  onCopiar,
}: QuestionCardProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const yaVista = useRef(false);
  const reducido = useReducedMotion();
  const idBase = useId();

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo || yaVista.current) return;
    // Sin `IntersectionObserver` (jsdom, navegadores antiguos) se cuenta como vista
    // al montar: perder el dato fino es preferible a no registrar nada.
    if (typeof IntersectionObserver === 'undefined') {
      yaVista.current = true;
      onVista();
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting && !yaVista.current) {
            yaVista.current = true;
            onVista();
            observador.disconnect();
          }
        }
      },
      { threshold: 0.35 },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [onVista]);

  /* ------------------------------ Contenido ------------------------------ */

  if (esContenido(pregunta.tipo)) {
    return (
      <div ref={contenedor} id={`pregunta-${pregunta.id}`} className="ev-anchor">
        <BloqueContenido pregunta={pregunta} />
      </div>
    );
  }

  /* --------------------------- Tipo desconocido -------------------------- */

  if (!esTipoConocido(pregunta.tipo)) {
    return (
      <div ref={contenedor} id={`pregunta-${pregunta.id}`} className="ev-anchor">
        <div className="glass ev-card" data-estado="sin-responder">
          <RichText doc={pregunta.enunciado} />
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <span>
              Este tipo de pregunta todavía no se puede responder desde el portal. No hace falta que
              hagas nada: <span className="font-semibold">no bloquea tu envío</span> y el equipo
              evaluador lo verá así.
            </span>
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------- Pregunta ----------------------------- */

  const spec = especificacionDe(pregunta.tipo);
  const problemaVisible = mostrarProblemas ? problema : null;
  const pendiente = mostrarProblemas && pregunta.obligatoria && !respondida;
  const estado = respondida ? 'respondida' : pendiente ? 'pendiente' : 'sin-responder';

  const idEnunciado = `${idBase}-enunciado`;
  const idAyuda = `${idBase}-ayuda`;
  const idProblema = `${idBase}-problema`;
  const tieneAyuda = !docRicoVacioP(pregunta.ayuda);
  const descritoPor =
    [tieneAyuda ? idAyuda : null, problemaVisible ? idProblema : null].filter(Boolean).join(' ') ||
    undefined;

  const imagenPregunta = String(pregunta.configuracion.imagenUrl ?? pregunta.medios?.imagenUrl ?? '');
  // En «rellenar huecos» el control dibuja la frase con los campos dentro; repetir el
  // enunciado encima la mostraría dos veces. Se conserva para los lectores de pantalla.
  const enunciadoOculto = enunciadoLoDibujaElControl(pregunta);

  // El elemento de lista lo pone quien compone la página (`RunnerScreen`): un `<ol>`
  // sólo admite `<li>` como hijo directo, y aquí hace falta agrupar el título de sección
  // con su primera pregunta dentro del MISMO elemento de lista.
  return (
    <div ref={contenedor} id={`pregunta-${pregunta.id}`} className="ev-anchor">
      {/*
        La entrada se anima con `animate` y **no** con `whileInView`, y esto se descubrió
        capturando la pantalla con movimiento reducido activado.
        
        Con `whileInView`, la tarjeta arranca en `opacity: 0` y sólo se hace visible
        cuando el observador de intersección la ve entrar. El problema es que el portal
        permite activar «movimiento reducido» **en caliente**, desde el centro de
        accesibilidad: al hacerlo, el objetivo de la animación desaparecía y las tarjetas
        se quedaban congeladas en invisible. Una persona que activaba esa preferencia a
        mitad de su evaluación veía desaparecer las preguntas.
        
        Con `animate`, el estado final se aplica siempre y sin depender de ningún
        observador: lo único que cambia con la preferencia es si hay transición o no.
      */}
      <motion.div
        className={cn('glass ev-card', !reducido && 'glass-sheen')}
        data-estado={estado}
        initial={reducido ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reducido
            ? { duration: 0 }
            : // El escalonado se acota: con veinte preguntas en una página, un retraso
              // proporcional dejaría la última esperando más de medio segundo.
              { duration: 0.3, delay: Math.min(indice * 0.035, 0.28), ease: [0.2, 0, 0, 1] }
        }
      >
        {/* Se usa `fieldset` porque muchos controles son grupos de radios o casillas:
            es el único elemento que asocia una pregunta con todas sus opciones. */}
        <fieldset className="flex flex-col gap-3 border-0 p-0" aria-describedby={descritoPor}>
          <legend className="w-full p-0">
            <div className="flex items-start gap-3">
              {numero > 0 && (
                <span
                  className="ev-tabular mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: respondida
                      ? 'rgb(var(--ev-accent) / 0.18)'
                      : 'rgb(var(--color-muted))',
                    color: respondida ? 'rgb(var(--ev-accent-ink))' : undefined,
                  }}
                  aria-hidden
                >
                  {respondida ? <Check className="h-4 w-4" strokeWidth={3} /> : numero}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div
                  id={idEnunciado}
                  className={
                    enunciadoOculto ? 'sr-only' : 'text-[1.02rem] font-medium leading-snug'
                  }
                >
                  <RichText doc={pregunta.enunciado} />
                </div>
                {enunciadoOculto && (
                  <p className="text-sm text-muted-foreground">
                    Completa los espacios en blanco de la frase.
                  </p>
                )}
                {pregunta.obligatoria && (
                  <span className="mt-1 inline-block text-xs font-semibold text-danger">
                    Obligatoria
                  </span>
                )}
              </div>

              {pregunta.puntos !== undefined && pregunta.puntos > 0 && (
                // Los puntos SÍ se muestran: son el peso de la pregunta, no la clave.
                <span className="ev-tabular shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {pregunta.puntos} {pregunta.puntos === 1 ? 'punto' : 'puntos'}
                </span>
              )}
            </div>
          </legend>

          {tieneAyuda && (
            <div id={idAyuda} className={cn('text-sm text-muted-foreground', numero > 0 && 'pl-10')}>
              <RichText doc={pregunta.ayuda} compacto />
            </div>
          )}

          {imagenPregunta && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenPregunta}
              alt={pregunta.medios?.textoAlternativo ?? ''}
              className="max-h-80 w-full rounded-2xl border border-border object-contain"
            />
          )}

          {pregunta.accesibilidad?.descripcionLarga && (
            <details className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <summary className="cursor-pointer font-medium">Descripción detallada</summary>
              <p className="mt-2 text-muted-foreground">
                {pregunta.accesibilidad.descripcionLarga}
              </p>
            </details>
          )}

          <div className={cn(numero > 0 && 'sm:pl-10')}>
            <AnswerControl
              pregunta={pregunta}
              valor={valor}
              onChange={onChange}
              bloqueado={bloqueado}
              bloquearPegado={bloquearPegado}
              onPegar={onPegar}
              onCopiar={onCopiar}
              describedBy={descritoPor}
              labelledBy={idEnunciado}
              invalido={Boolean(problemaVisible)}
            />
          </div>

          {problemaVisible && (
            <p
              id={idProblema}
              role="alert"
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium text-danger',
                numero > 0 && 'sm:pl-10',
              )}
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {problemaVisible}
            </p>
          )}

          {/* Estado en palabras, para quien no ve el canto de luz ni el icono. */}
          <span className="sr-only">
            {respondida ? 'Pregunta respondida.' : 'Pregunta sin responder.'}
            {spec?.multiple ? ' Admite varias respuestas.' : ''}
          </span>
        </fieldset>
      </motion.div>
    </div>
  );
}
