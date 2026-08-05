'use client';

/**
 * Controles de respuesta: uno por FORMA, no uno por tipo.
 *
 * Los treinta y nueve tipos del catálogo se reducen a catorce formas de valor, y
 * agrupar por forma evita treinta y nueve ramas casi idénticas que se
 * desincronizan a la primera corrección. El `switch` de abajo va sobre `espera`,
 * exactamente igual que el calificador del servidor (`14_Scoring.gs`), así que
 * dibujar y calificar comparten la misma clasificación.
 *
 * ── Decisiones de accesibilidad que condicionan el diseño ───────────────────
 *  · **Controles nativos siempre.** Cada opción es un `<input type="radio">` o
 *    `<input type="checkbox">` real, visualmente oculto dentro de su `<label>`. El
 *    aspecto lo pone la etiqueta con un `data-marcada`; el teclado, los grupos, el
 *    anuncio del estado y el modo de contraste forzado los pone el navegador. Un
 *    `<div role="radio">` obliga a reimplementar las flechas, el `Home`/`End` y el
 *    foco, y siempre queda algo a medias.
 *  · **Ordenar no depende de arrastrar.** Se puede arrastrar (es agradable), pero
 *    los botones «subir» y «bajar» son la vía principal y la única que existe con
 *    teclado. Un control que sólo se opera con el ratón excluye a quien no usa
 *    ratón, y en una evaluación eso es excluir a la persona del proceso.
 *  · **Cuadrículas responsivas de verdad.** En escritorio son una tabla con
 *    encabezados asociados; por debajo de `sm` se convierten en tarjetas apiladas.
 *    Una tabla de cinco columnas con desplazamiento horizontal en un móvil es una
 *    forma fiable de que alguien marque la celda equivocada.
 *  · **El área de toque es la fila completa.** Apuntar a un círculo de 16 px con el
 *    pulgar es la diferencia entre responder y equivocarse.
 */

import { useId, useMemo, useState, type ClipboardEvent } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, GripVertical, Star } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import type { OpcionPublica, PreguntaPublica } from '../domain/contract';
import type { ValorRespuesta } from '../domain/answers';
import { especificacionDe } from '../domain/question-types';
import { textoPlanoDe } from '../domain/rich-text';
import { RichTextInline } from './RichText';

export interface AnswerControlProps {
  pregunta: PreguntaPublica;
  valor: ValorRespuesta | undefined;
  onChange: (valor: ValorRespuesta) => void;
  /** El formulario se congela al enviar y al agotarse el tiempo. */
  bloqueado: boolean;
  bloquearPegado: boolean;
  onPegar: (caracteres: number) => void;
  onCopiar: () => void;
  /** Id del elemento que describe el campo (ayuda + error), para `aria-describedby`. */
  describedBy?: string;
  /**
   * Id del enunciado, para `aria-labelledby`.
   *
   * Los controles de una sola pieza (texto, número, fecha, desplegable, enlace) NO
   * heredan el nombre del `<legend>` de forma fiable: hay lectores de pantalla que
   * anuncian «campo de texto, en blanco» y dejan a la persona sin saber qué se le
   * pregunta. Los grupos de radios y casillas sí lo heredan, y además cada opción
   * tiene su propia etiqueta, así que ahí no hace falta.
   */
  labelledBy?: string;
  invalido?: boolean;
}

/* ========================================================================== */
/* Utilidades locales                                                         */
/* ========================================================================== */

function numeroDe(valor: unknown, respaldo: number): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
}

function numeroOpcional(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

function listaDeTextos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.map(String).filter((texto) => texto !== '') : [];
}

function etiquetaDe(opcion: OpcionPublica): string {
  return textoPlanoDe(opcion.texto) || opcion.valor || opcion.id;
}

/* ========================================================================== */
/* Opción marcable (radio / casilla)                                          */
/* ========================================================================== */

function OpcionMarcable({
  nombre,
  opcion,
  multiple,
  comoCasilla,
  marcada,
  bloqueado,
  onToggle,
  conImagen,
}: {
  nombre: string;
  opcion: OpcionPublica;
  multiple: boolean;
  /**
   * Dibujar una casilla aunque la respuesta sea de opción única.
   *
   * `casilla_aceptacion` es, en el catálogo del servidor, una pregunta de opción única
   * con una sola opción, y su valor viaja como `{ opciones: ["op_si"] }`. Pero para
   * quien la responde no es «elige una entre varias»: es «marca esta casilla para
   * declarar algo». Un radio solitario en ese sitio confunde —parece que falta la otra
   * opción— y además no es lo que nadie espera de una declaración. El tipo de control
   * cambia; el valor enviado, no.
   */
  comoCasilla: boolean;
  marcada: boolean;
  bloqueado: boolean;
  onToggle: () => void;
  conImagen: boolean;
}) {
  const reducido = useReducedMotion();

  return (
    <label
      className={cn('ev-option cursor-pointer', conImagen && 'flex-col items-stretch')}
      data-marcada={marcada}
      data-inerte={bloqueado}
    >
      <input
        // Un `radio` con `name` compartido da la semántica de grupo y la navegación
        // con flechas sin una línea de JavaScript.
        type={multiple || comoCasilla ? 'checkbox' : 'radio'}
        name={nombre}
        value={opcion.id}
        checked={marcada}
        disabled={bloqueado}
        onChange={onToggle}
        // Un radio ya marcado no dispara `change`; con esto se puede desmarcar,
        // que es lo que espera quien eligió por error en una pregunta opcional.
        onClick={() => {
          if (!multiple && marcada && !bloqueado) onToggle();
        }}
        className="ev-native-input"
      />

      {conImagen && opcion.imagenUrl && (
        // Imagen decorativa: el texto de la opción es la etiqueta real, así que un
        // `alt` repetido sólo duplicaría el anuncio del lector de pantalla.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={opcion.imagenUrl}
          alt=""
          className="mb-2 h-32 w-full rounded-xl border border-border object-cover"
        />
      )}

      <span className="flex w-full items-start gap-3">
        <span
          className="ev-indicator"
          data-forma={multiple || comoCasilla ? 'cuadro' : 'circulo'}
          aria-hidden
        >
          <AnimatePresence initial={false}>
            {marcada && (
              <motion.span
                initial={reducido ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reducido ? undefined : { scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 26 }}
                className="grid place-items-center"
              >
                {multiple || comoCasilla ? (
                  <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="min-w-0 flex-1 text-[0.95rem] leading-snug">
          <RichTextInline doc={opcion.texto} />
        </span>
      </span>
    </label>
  );
}

/* ========================================================================== */
/* Control segmentado (verdadero/falso, sí/no/N-A)                            */
/* ========================================================================== */

/**
 * Dos o tres opciones en una sola fila, con un realce que se desliza.
 *
 * `layoutId` hace que el realce viaje entre segmentos en lugar de aparecer y
 * desaparecer: es el detalle que separa un control que se siente físico de tres
 * botones sueltos. Con movimiento reducido, el realce simplemente cambia de sitio.
 */
function ControlSegmentado({
  nombre,
  opciones,
  seleccionada,
  bloqueado,
  onElegir,
}: {
  nombre: string;
  opciones: OpcionPublica[];
  seleccionada: string | undefined;
  bloqueado: boolean;
  onElegir: (id: string) => void;
}) {
  const reducido = useReducedMotion();

  return (
    <div
      className="inline-flex w-full max-w-md gap-1 rounded-2xl border border-border bg-muted/50 p-1"
      role="radiogroup"
      aria-label="Opciones de respuesta"
    >
      {opciones.map((opcion) => {
        const activa = seleccionada === opcion.id;
        return (
          <label
            key={opcion.id}
            className={cn(
              'relative flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-colors',
              activa ? 'text-white' : 'text-muted-foreground hover:text-foreground',
              bloqueado && 'cursor-not-allowed opacity-[var(--opacity-disabled)]',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--color-ring))]',
            )}
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.id}
              checked={activa}
              disabled={bloqueado}
              onChange={() => onElegir(opcion.id)}
              className="ev-native-input"
            />
            {activa && (
              <motion.span
                layoutId={reducido ? undefined : `${nombre}-realce`}
                className="absolute inset-0 rounded-xl"
                // Lleva texto blanco encima: el acento vivo daría 2,7:1.
                style={{ backgroundColor: 'rgb(var(--ev-accent-ink))' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span className="relative z-10">
              <RichTextInline doc={opcion.texto} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ========================================================================== */
/* Ordenar                                                                    */
/* ========================================================================== */

function FilaOrdenable({
  opcion,
  indice,
  total,
  bloqueado,
  onMover,
}: {
  opcion: OpcionPublica;
  indice: number;
  total: number;
  bloqueado: boolean;
  onMover: (desde: number, hacia: number) => void;
}) {
  const controles = useDragControls();
  const etiqueta = etiquetaDe(opcion);

  return (
    <Reorder.Item
      value={opcion.id}
      dragListener={false}
      dragControls={controles}
      className="flex items-center gap-2 rounded-2xl border border-border bg-[rgb(var(--glass-tint)/var(--glass-alpha-input))] px-3 py-2.5"
      whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-glass-lg)', zIndex: 2 }}
    >
      <button
        type="button"
        // El asa sólo sirve para arrastrar con puntero. Se saca del orden de
        // tabulación porque los botones de subir/bajar ya cubren el teclado, y un
        // control enfocable que no hace nada con `Enter` es una trampa.
        tabIndex={-1}
        aria-hidden
        disabled={bloqueado}
        onPointerDown={(evento) => {
          if (!bloqueado) controles.start(evento);
        }}
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span
        className="ev-tabular grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
        style={{
          backgroundColor: 'rgb(var(--ev-accent) / 0.16)',
          color: 'rgb(var(--ev-accent-ink))',
        }}
      >
        {indice + 1}
      </span>

      <span className="min-w-0 flex-1 text-sm">
        <RichTextInline doc={opcion.texto} />
      </span>

      {/*
        24×24 px como mínimo, y no es un número arbitrario: es el umbral de la WCAG 2.2
        para el tamaño de un objetivo (criterio 2.5.8). La primera versión los dejaba en
        unos 20 px y axe lo marcó. Además de cumplir, son la vía **principal** para
        reordenar —arrastrar es el extra— así que tenían que ser cómodos de pulsar con
        el pulgar.
      */}
      <span className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={bloqueado || indice === 0}
          onClick={() => onMover(indice, indice - 1)}
          aria-label={`Subir «${etiqueta}» a la posición ${indice}`}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={bloqueado || indice === total - 1}
          onClick={() => onMover(indice, indice + 1)}
          aria-label={`Bajar «${etiqueta}» a la posición ${indice + 2}`}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      </span>
    </Reorder.Item>
  );
}

/* ========================================================================== */
/* Cuadrícula                                                                 */
/* ========================================================================== */

function Cuadricula({
  nombre,
  filas,
  columnas,
  multiple,
  mapa,
  bloqueado,
  onCambiar,
}: {
  nombre: string;
  filas: OpcionPublica[];
  columnas: string[];
  multiple: boolean;
  mapa: Record<string, string | string[]>;
  bloqueado: boolean;
  onCambiar: (siguiente: Record<string, string | string[]>) => void;
}) {
  const alternar = (filaId: string, columna: string) => {
    const actual = mapa[filaId];
    const siguiente = { ...mapa };
    if (multiple) {
      const lista = Array.isArray(actual) ? [...actual] : [];
      siguiente[filaId] = lista.includes(columna)
        ? lista.filter((entrada) => entrada !== columna)
        : [...lista, columna];
    } else {
      siguiente[filaId] = actual === columna ? '' : columna;
    }
    onCambiar(siguiente);
  };

  const marcada = (filaId: string, columna: string): boolean => {
    const actual = mapa[filaId];
    return multiple ? Array.isArray(actual) && actual.includes(columna) : actual === columna;
  };

  if (columnas.length === 0) {
    return (
      <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
        Esta cuadrícula no tiene columnas configuradas, así que no se puede responder. Avisa a quien
        te envió el enlace: la evaluación necesita corregirse en el sistema de reclutamiento.
      </p>
    );
  }

  return (
    <>
      {/* Escritorio: tabla con encabezados asociados. */}
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Elige {multiple ? 'una o varias columnas' : 'una columna'} para cada fila.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-[38%] pb-2 text-left text-xs font-semibold text-muted-foreground">
                Elemento
              </th>
              {columnas.map((columna) => (
                <th
                  key={columna}
                  scope="col"
                  className="px-2 pb-2 text-center text-xs font-semibold text-muted-foreground"
                >
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="border-t border-border transition-colors hover:bg-muted/40">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  <RichTextInline doc={fila.texto} />
                </th>
                {columnas.map((columna) => (
                  <td key={columna} className="px-2 py-2.5 text-center">
                    <label className="relative inline-grid cursor-pointer place-items-center p-2">
                      <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name={`${nombre}-${fila.id}`}
                        checked={marcada(fila.id, columna)}
                        disabled={bloqueado}
                        onChange={() => alternar(fila.id, columna)}
                        className="ev-native-input"
                      />
                      <span
                        className="ev-indicator"
                        data-forma={multiple ? 'cuadro' : 'circulo'}
                        data-marcada={marcada(fila.id, columna)}
                        style={
                          marcada(fila.id, columna)
                            ? {
                                borderColor: 'rgb(var(--ev-accent-ink))',
                                backgroundColor: 'rgb(var(--ev-accent-ink))',
                              }
                            : undefined
                        }
                        aria-hidden
                      >
                        {marcada(fila.id, columna) &&
                          (multiple ? (
                            <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ))}
                      </span>
                      <span className="sr-only">{`${etiquetaDe(fila)}: ${columna}`}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: una tarjeta por fila, con las columnas como pastillas. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filas.map((fila) => (
          <fieldset key={fila.id} className="rounded-2xl border border-border p-3">
            <legend className="px-1 text-sm font-medium">
              <RichTextInline doc={fila.texto} />
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {columnas.map((columna) => {
                const activa = marcada(fila.id, columna);
                return (
                  <label
                    key={columna}
                    className={cn(
                      'relative cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      activa ? 'text-white' : 'border-border text-muted-foreground',
                      bloqueado && 'opacity-[var(--opacity-disabled)]',
                    )}
                    style={
                      activa
                        ? {
                            backgroundColor: 'rgb(var(--ev-accent-ink))',
                            borderColor: 'rgb(var(--ev-accent-ink))',
                          }
                        : undefined
                    }
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`${nombre}-m-${fila.id}`}
                      checked={activa}
                      disabled={bloqueado}
                      onChange={() => alternar(fila.id, columna)}
                      className="ev-native-input"
                    />
                    {columna}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </>
  );
}

/* ========================================================================== */
/* Huecos en línea                                                            */
/* ========================================================================== */

/**
 * Rellenar huecos, con los campos dentro de la frase.
 *
 * ── Una limitación del contrato, resuelta como el ATS ────────────────────────
 * Las claves de los huecos viven en `respuestaEsperada.huecos[].clave`, y eso
 * **no se publica**: revelarlo sería revelar la estructura de la respuesta. El
 * runner del ATS resuelve lo mismo contando los grupos de `___` y numerando
 * `h1…hn`, y el calificador compara por esa clave. Aquí se hace **idéntico**, a
 * propósito: si los dos runners numeraran distinto, la misma respuesta se
 * calificaría de forma distinta según por dónde entró el candidato.
 *
 * Lo que sí se mejora es la presentación: los campos van donde estaban los
 * guiones, no en una lista de «Hueco 1 / Hueco 2» al pie que obliga a reconstruir
 * mentalmente la correspondencia.
 */
function HuecosEnLinea({
  pregunta,
  mapa,
  bloqueado,
  onCambiar,
  manejadoresTexto,
  describedBy,
}: {
  pregunta: PreguntaPublica;
  mapa: Record<string, string>;
  bloqueado: boolean;
  onCambiar: (siguiente: Record<string, string>) => void;
  manejadoresTexto: { onPaste: (evento: ClipboardEvent) => void; onCopy: () => void };
  describedBy?: string;
}) {
  const plantilla = useMemo(() => {
    const base =
      typeof pregunta.configuracion.huecosTexto === 'string' &&
      pregunta.configuracion.huecosTexto.trim() !== ''
        ? pregunta.configuracion.huecosTexto
        : textoPlanoDe(pregunta.enunciado);
    // Se divide conservando los separadores para poder intercalar los campos.
    const trozos = base.split(/(_{2,})/g);
    let contador = 0;
    return trozos.map((trozo) => {
      if (/^_{2,}$/.test(trozo)) {
        contador += 1;
        return { tipo: 'hueco' as const, clave: `h${contador}`, numero: contador };
      }
      return { tipo: 'texto' as const, texto: trozo };
    });
  }, [pregunta.configuracion.huecosTexto, pregunta.enunciado]);

  const huecos = plantilla.filter((parte) => parte.tipo === 'hueco');

  // Sin ningún `___`, un campo suelto es mejor que nada: el candidato puede
  // responder y el revisor lo verá igual.
  if (huecos.length === 0) {
    return (
      <input
        type="text"
        value={mapa.h1 ?? ''}
        disabled={bloqueado}
        aria-label="Respuesta"
        aria-describedby={describedBy}
        onChange={(evento) => onCambiar({ ...mapa, h1: evento.target.value })}
        {...manejadoresTexto}
        className="glass-input w-full rounded-md border border-border px-4 py-2.5"
      />
    );
  }

  return (
    <p className="text-[0.98rem] leading-loose">
      {plantilla.map((parte, indice) =>
        parte.tipo === 'texto' ? (
          <span key={indice}>{parte.texto}</span>
        ) : (
          <input
            key={indice}
            type="text"
            className="ev-blank"
            value={mapa[parte.clave] ?? ''}
            disabled={bloqueado}
            aria-label={`Hueco ${parte.numero} de ${huecos.length}`}
            aria-describedby={describedBy}
            size={Math.max(10, (mapa[parte.clave] ?? '').length + 2)}
            onChange={(evento) => onCambiar({ ...mapa, [parte.clave]: evento.target.value })}
            {...manejadoresTexto}
          />
        ),
      )}
    </p>
  );
}

/* ========================================================================== */
/* El control                                                                 */
/* ========================================================================== */

export function AnswerControl({
  pregunta,
  valor,
  onChange,
  bloqueado,
  bloquearPegado,
  onPegar,
  onCopiar,
  describedBy,
  labelledBy,
  invalido,
}: AnswerControlProps) {
  const spec = especificacionDe(pregunta.tipo);
  const grupo = useId();
  const reducido = useReducedMotion();
  const [estrellaSobre, setEstrellaSobre] = useState(0);

  if (!spec || spec.clase !== 'pregunta') return null;

  const config = pregunta.configuracion;
  const seleccionadas = valor?.opciones ?? [];

  /**
   * Manejadores de portapapeles, comunes a todo campo de texto.
   *
   * Del pegado se registra la LONGITUD, nunca el contenido: saber que alguien trajo
   * mil doscientos caracteres de fuera es información útil para un revisor; saber
   * *qué* trajo sería leerle el portapapeles, y eso no se hace.
   */
  const manejadoresTexto = {
    onPaste: (evento: ClipboardEvent) => {
      const texto = evento.clipboardData.getData('text');
      onPegar(texto.length);
      if (bloquearPegado) evento.preventDefault();
    },
    onCopy: () => onCopiar(),
  };

  const clasesCampo = cn(
    'glass-input w-full rounded-md border px-4 py-2.5 text-base transition-shadow',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)]',
    invalido ? 'border-danger' : 'border-border',
  );

  const atributosCampo = {
    disabled: bloqueado,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': invalido ? true : undefined,
  } as const;

  switch (spec.espera) {
    /* ------------------------------- Opciones ----------------------------- */
    case 'opcion':
    case 'opciones': {
      const multiple = spec.espera === 'opciones';
      const maximo = numeroOpcional(config.maximoSelecciones);
      const minimo = numeroOpcional(config.minimoSelecciones);

      if (pregunta.tipo === 'desplegable') {
        return (
          <select
            value={seleccionadas[0] ?? ''}
            onChange={(evento) =>
              onChange({ opciones: evento.target.value ? [evento.target.value] : [] })
            }
            {...atributosCampo}
            className={cn(clasesCampo, 'max-w-md')}
          >
            <option value="">Elige una opción…</option>
            {pregunta.opciones.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {etiquetaDe(opcion)}
              </option>
            ))}
          </select>
        );
      }

      // Dos o tres opciones cortas y excluyentes piden un segmentado, no una lista
      // vertical: la comparación es inmediata y ocupa una fila en lugar de tres.
      const esSegmentado =
        (pregunta.tipo === 'verdadero_falso' || pregunta.tipo === 'si_no_na') &&
        pregunta.opciones.length <= 3;
      if (esSegmentado) {
        return (
          <ControlSegmentado
            nombre={grupo}
            opciones={pregunta.opciones}
            seleccionada={seleccionadas[0]}
            bloqueado={bloqueado}
            onElegir={(id) => onChange({ opciones: seleccionadas[0] === id ? [] : [id] })}
          />
        );
      }

      const conImagen = pregunta.tipo === 'opcion_imagen';
      const comoCasilla = pregunta.tipo === 'casilla_aceptacion';
      const columnas = numeroDe(config.columnas, conImagen ? 3 : 1);

      return (
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              conImagen
                ? 'grid gap-2'
                : columnas > 1
                  ? 'grid gap-2 sm:grid-cols-2'
                  : 'flex flex-col gap-2',
            )}
            style={conImagen ? { gridTemplateColumns: `repeat(${Math.min(columnas, 4)}, minmax(0, 1fr))` } : undefined}
            role={multiple ? 'group' : undefined}
          >
            {pregunta.opciones.map((opcion) => {
              const marcada = seleccionadas.includes(opcion.id);
              // Con el máximo alcanzado, las no elegidas se desactivan en lugar de
              // aceptar el clic y descartarlo en silencio: un control que no
              // reacciona parece roto.
              const topeAlcanzado =
                multiple && maximo !== undefined && !marcada && seleccionadas.length >= maximo;
              return (
                <OpcionMarcable
                  key={opcion.id}
                  nombre={grupo}
                  opcion={opcion}
                  multiple={multiple}
                  comoCasilla={comoCasilla}
                  marcada={marcada}
                  bloqueado={bloqueado || topeAlcanzado}
                  conImagen={conImagen}
                  onToggle={() => {
                    if (!multiple) {
                      onChange({ opciones: marcada ? [] : [opcion.id] });
                      return;
                    }
                    onChange({
                      opciones: marcada
                        ? seleccionadas.filter((id) => id !== opcion.id)
                        : [...seleccionadas, opcion.id],
                    });
                  }}
                />
              );
            })}
          </div>

          {multiple && (minimo !== undefined || maximo !== undefined) && (
            <p className="text-xs text-muted-foreground">
              {minimo !== undefined && maximo !== undefined
                ? `Elige entre ${minimo} y ${maximo} opciones.`
                : minimo !== undefined
                  ? `Elige al menos ${minimo}.`
                  : `Elige hasta ${maximo}.`}{' '}
              <span className="ev-tabular font-medium">
                Llevas {seleccionadas.length}.
              </span>
            </p>
          )}
        </div>
      );
    }

    /* -------------------------------- Escalas ----------------------------- */
    case 'escala': {
      if (pregunta.tipo === 'estrellas') {
        const total = Math.min(10, numeroDe(config.estrellas, 5));
        const actual = numeroDe(valor?.valor, 0);
        const mostrado = estrellaSobre || actual;
        return (
          <div
            className="flex items-center gap-1"
            role="radiogroup"
            aria-label="Valoración con estrellas"
            onMouseLeave={() => setEstrellaSobre(0)}
          >
            {Array.from({ length: total }, (_, indice) => indice + 1).map((punto) => (
              <label
                key={punto}
                className="relative cursor-pointer p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--color-ring))]"
                onMouseEnter={() => !bloqueado && setEstrellaSobre(punto)}
              >
                <input
                  type="radio"
                  name={grupo}
                  checked={actual === punto}
                  disabled={bloqueado}
                  onChange={() => onChange({ valor: punto })}
                  className="ev-native-input"
                />
                <motion.span
                  className="block"
                  animate={reducido ? undefined : { scale: punto <= mostrado ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      punto <= mostrado ? 'fill-warning text-warning' : 'text-muted-foreground',
                    )}
                    aria-hidden
                  />
                </motion.span>
                <span className="sr-only">{`${punto} de ${total}`}</span>
              </label>
            ))}
            {actual > 0 && (
              <span className="ev-tabular ml-2 text-sm font-semibold">
                {actual} / {total}
              </span>
            )}
          </div>
        );
      }

      const minimo = numeroDe(config.minimo, 1);
      const maximo = numeroDe(config.maximo, 5);
      const paso = Math.max(numeroDe(config.paso, 1), 0.01);
      const etiquetaMin = String(config.etiquetaMinimo ?? '');
      const etiquetaMax = String(config.etiquetaMaximo ?? '');

      if (pregunta.tipo === 'deslizador') {
        const respondida = valor?.valor !== undefined && valor?.valor !== null && valor?.valor !== '';
        const actual = respondida ? numeroDe(valor?.valor, minimo) : minimo;
        const relleno = maximo > minimo ? ((actual - minimo) / (maximo - minimo)) * 100 : 0;
        return (
          <div className="flex max-w-xl flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <input
                type="range"
                className="ev-slider"
                style={{ ['--ev-fill' as string]: `${relleno}%` }}
                min={minimo}
                max={maximo}
                step={paso}
                value={actual}
                disabled={bloqueado}
                // Sin esto el deslizador se anuncia como «control deslizante» sin decir
                // de qué: es el único control del módulo que no está envuelto en una
                // etiqueta ni forma grupo, así que necesita apuntar al enunciado.
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                aria-valuetext={`${actual}${config.sufijo ? String(config.sufijo) : ''}`}
                onChange={(evento) => onChange({ valor: Number(evento.target.value) })}
              />
              <output
                className="ev-tabular min-w-16 rounded-xl px-3 py-1.5 text-center text-sm font-bold"
                style={{
                  backgroundColor: 'rgb(var(--ev-accent) / 0.14)',
                  color: 'rgb(var(--ev-accent-ink))',
                }}
              >
                {respondida ? actual : '—'}
                {config.sufijo ? String(config.sufijo) : ''}
              </output>
            </div>
            {(etiquetaMin || etiquetaMax) && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{etiquetaMin}</span>
                <span>{etiquetaMax}</span>
              </div>
            )}
          </div>
        );
      }

      // Escala lineal: se dibujan los puntos si son pocos, con un tope defensivo
      // para que un `1..1000` no genere mil botones.
      const puntos: number[] = [];
      for (let punto = minimo; punto <= maximo && puntos.length < 21; punto += paso) {
        puntos.push(Number(punto.toFixed(2)));
      }
      const actual = valor?.valor;

      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Escala">
            {puntos.map((punto) => {
              const activo = Number(actual) === punto;
              return (
                <label
                  key={punto}
                  className={cn(
                    'ev-tabular relative grid h-11 min-w-11 cursor-pointer place-items-center rounded-xl border px-2 text-sm font-semibold transition-all',
                    activo ? 'text-white' : 'border-border text-muted-foreground hover:text-foreground',
                    bloqueado && 'cursor-not-allowed opacity-[var(--opacity-disabled)]',
                    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--color-ring))]',
                  )}
                  style={
                    activo
                      ? {
                          backgroundColor: 'rgb(var(--ev-accent-ink))',
                          borderColor: 'rgb(var(--ev-accent-ink))',
                        }
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name={grupo}
                    checked={activo}
                    disabled={bloqueado}
                    onChange={() => onChange({ valor: punto })}
                    className="ev-native-input"
                  />
                  {punto}
                </label>
              );
            })}
          </div>
          {(etiquetaMin || etiquetaMax) && (
            <div className="flex max-w-md justify-between text-xs text-muted-foreground">
              <span>{etiquetaMin}</span>
              <span>{etiquetaMax}</span>
            </div>
          )}
        </div>
      );
    }

    /* ------------------------------ Cuadrículas ---------------------------- */
    case 'matriz': {
      const columnas = listaDeTextos(config.columnasMatriz);
      const filas =
        pregunta.opciones.length > 0
          ? pregunta.opciones
          : listaDeTextos(config.filasMatriz).map((texto, indice) => ({
              id: `fila_${indice + 1}`,
              valor: texto,
              texto: { v: 1, b: [{ t: 'p' as const, s: [{ x: texto }] }] },
            }));

      return (
        <Cuadricula
          nombre={grupo}
          filas={filas}
          columnas={columnas}
          multiple={spec.multiple === true}
          mapa={(valor?.valor ?? {}) as Record<string, string | string[]>}
          bloqueado={bloqueado}
          onCambiar={(siguiente) => onChange({ valor: siguiente })}
        />
      );
    }

    /* --------------------------------- Orden ------------------------------- */
    case 'orden': {
      // El orden inicial es EXACTAMENTE el que llegó del servidor: ya viene mezclado
      // de forma determinista por intento, y reordenarlo aquí cambiaría la prueba al
      // recargar la página.
      const ordenActual = listaDeTextos(valor?.valor);
      const ids = pregunta.opciones.map((opcion) => opcion.id);
      const orden =
        ordenActual.length === ids.length && ordenActual.every((id) => ids.includes(id))
          ? ordenActual
          : ids;

      const mover = (desde: number, hacia: number) => {
        if (hacia < 0 || hacia >= orden.length) return;
        const siguiente = [...orden];
        const [movido] = siguiente.splice(desde, 1);
        if (movido === undefined) return;
        siguiente.splice(hacia, 0, movido);
        onChange({ valor: siguiente });
      };

      return (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Coloca los elementos en el orden correcto, del primero al último. Puedes arrastrarlos o
            usar los botones de subir y bajar.
          </p>
          <Reorder.Group
            axis="y"
            values={orden}
            onReorder={(siguiente: string[]) => !bloqueado && onChange({ valor: siguiente })}
            className="flex list-none flex-col gap-2"
            as="ol"
          >
            {orden.map((id, indice) => {
              const opcion = pregunta.opciones.find((entrada) => entrada.id === id);
              if (!opcion) return null;
              return (
                <FilaOrdenable
                  key={id}
                  opcion={opcion}
                  indice={indice}
                  total={orden.length}
                  bloqueado={bloqueado}
                  onMover={mover}
                />
              );
            })}
          </Reorder.Group>
        </div>
      );
    }

    /* ------------------------ Emparejar y clasificar ----------------------- */
    case 'emparejamiento':
    case 'clasificacion': {
      const mapa = (valor?.valor ?? {}) as Record<string, string>;
      /**
       * Destinos posibles.
       *
       * En `clasificar` son los grupos que el autor definió (`configuracion.grupos`).
       * En `emparejar`, las parejas correctas viven en `claveEmparejamiento` y el
       * servidor **no las publica**: sin lista, el ATS cae en un campo de texto
       * libre. Aquí se aprovecha que `grupos` también viaja para `emparejar`: si el
       * autor lo rellenó, se ofrece un desplegable —mucho mejor que teclear una
       * pareja a ciegas— y si no, se cae al texto libre igual que el ATS.
       */
      const destinos = listaDeTextos(config.grupos);

      return (
        <ul className="flex list-none flex-col gap-2">
          {pregunta.opciones.map((opcion) => {
            const etiquetaOpcion = etiquetaDe(opcion);
            return (
              <li
                key={opcion.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-[rgb(var(--glass-tint)/var(--glass-alpha-input))] px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm">
                  <RichTextInline doc={opcion.texto} />
                </span>
                {destinos.length > 0 ? (
                  <select
                    value={mapa[opcion.id] ?? ''}
                    disabled={bloqueado}
                    aria-label={`Destino de «${etiquetaOpcion}»`}
                    onChange={(evento) =>
                      onChange({ valor: { ...mapa, [opcion.id]: evento.target.value } })
                    }
                    className="glass-input rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <option value="">Elige…</option>
                    {destinos.map((destino) => (
                      <option key={destino} value={destino}>
                        {destino}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={mapa[opcion.id] ?? ''}
                    disabled={bloqueado}
                    aria-label={`Pareja de «${etiquetaOpcion}»`}
                    placeholder="Su pareja"
                    onChange={(evento) =>
                      onChange({ valor: { ...mapa, [opcion.id]: evento.target.value } })
                    }
                    {...manejadoresTexto}
                    className="glass-input w-44 rounded-md border border-border px-3 py-2 text-sm"
                  />
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    /* -------------------------------- Huecos ------------------------------- */
    case 'huecos':
      return (
        <HuecosEnLinea
          pregunta={pregunta}
          mapa={(valor?.valor ?? {}) as Record<string, string>}
          bloqueado={bloqueado}
          onCambiar={(siguiente) => onChange({ valor: siguiente })}
          manejadoresTexto={manejadoresTexto}
          describedBy={describedBy}
        />
      );

    /* -------------------------------- Números ------------------------------ */
    case 'numero': {
      const prefijo = String(config.prefijo ?? (pregunta.tipo === 'moneda' ? config.moneda ?? '' : ''));
      const sufijo = String(config.sufijo ?? (pregunta.tipo === 'porcentaje' ? '%' : ''));
      return (
        <div className="flex max-w-xs items-center gap-2">
          {prefijo && <span className="text-sm font-medium text-muted-foreground">{prefijo}</span>}
          <input
            type="number"
            inputMode="decimal"
            min={numeroOpcional(config.minimo)}
            max={numeroOpcional(config.maximo)}
            step={config.paso === undefined ? 'any' : numeroDe(config.paso, 1)}
            value={valor?.valor === undefined || valor?.valor === null ? '' : String(valor.valor)}
            onChange={(evento) =>
              onChange({ valor: evento.target.value === '' ? null : Number(evento.target.value) })
            }
            {...manejadoresTexto}
            {...atributosCampo}
            className={clasesCampo}
          />
          {sufijo && <span className="text-sm font-medium text-muted-foreground">{sufijo}</span>}
        </div>
      );
    }

    /* ------------------------------ Fecha y hora --------------------------- */
    case 'fecha':
    case 'hora': {
      const tipoInput =
        pregunta.tipo === 'hora' ? 'time' : pregunta.tipo === 'fecha_hora' ? 'datetime-local' : 'date';
      return (
        <input
          type={tipoInput}
          value={String(valor?.valor ?? '')}
          onChange={(evento) => onChange({ valor: evento.target.value })}
          {...atributosCampo}
          className={cn(clasesCampo, 'max-w-xs')}
        />
      );
    }

    /* -------------------------------- Archivo ------------------------------ */
    case 'archivo':
      return (
        <div className="flex max-w-xl flex-col gap-1.5">
          <input
            type="url"
            inputMode="url"
            value={String(valor?.valor ?? '')}
            placeholder="https://…"
            onChange={(evento) => onChange({ valor: evento.target.value })}
            {...manejadoresTexto}
            {...atributosCampo}
            className={clasesCampo}
          />
          <p className="text-xs text-muted-foreground">
            {String(config.ayudaArchivo ?? 'Comparte el enlace con permiso de lectura.')}
          </p>
        </div>
      );

    /* --------------------------------- Texto ------------------------------- */
    case 'texto':
    default: {
      const esCodigo = pregunta.tipo === 'codigo';
      const lineas = esCodigo ? numeroDe(config.lineasCodigo, 10) : numeroDe(config.lineas, 0);
      const maximo = numeroOpcional(config.maximoCaracteres);
      const minimo = numeroOpcional(config.minimoCaracteres);

      if (pregunta.tipo === 'texto_largo' || esCodigo || lineas > 1) {
        const texto = String(valor?.valor ?? '');
        const cerca = maximo !== undefined && texto.length > maximo * 0.9;
        return (
          <div className="flex flex-col gap-1">
            <textarea
              rows={lineas || 5}
              value={texto}
              maxLength={maximo}
              placeholder={String(config.marcador ?? '')}
              onChange={(evento) => onChange({ valor: evento.target.value })}
              {...manejadoresTexto}
              {...atributosCampo}
              className={cn(clasesCampo, 'resize-y', esCodigo && 'font-mono text-sm')}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {minimo !== undefined && texto.trim().length < minimo
                  ? `Faltan ${minimo - texto.trim().length} caracteres para el mínimo.`
                  : ''}
              </span>
              <span className={cn('ev-tabular', cerca && 'font-semibold text-warning')}>
                {texto.length}
                {maximo !== undefined ? ` / ${maximo}` : ''}
              </span>
            </div>
          </div>
        );
      }

      const tipoInput =
        pregunta.tipo === 'correo'
          ? 'email'
          : pregunta.tipo === 'telefono'
            ? 'tel'
            : pregunta.tipo === 'enlace'
              ? 'url'
              : 'text';
      return (
        <input
          type={tipoInput}
          value={String(valor?.valor ?? '')}
          maxLength={maximo}
          placeholder={String(config.marcador ?? '')}
          autoComplete="off"
          onChange={(evento) => onChange({ valor: evento.target.value })}
          {...manejadoresTexto}
          {...atributosCampo}
          className={cn(clasesCampo, 'max-w-xl')}
        />
      );
    }
  }
}
