/**
 * Modelo de respuesta: una forma por `expects`, y nada más.
 *
 * ── El contrato del valor, literal ───────────────────────────────────────────
 * El calificador del servidor (`14_Scoring.gs`) espera exactamente esto:
 *
 *   opcion / opciones   { opciones: ["op_a"] }            ids de opción
 *   texto               { valor: "texto" }
 *   numero / escala     { valor: 1250.5 }                 número, no cadena
 *   fecha / hora        { valor: "2026-07-30" }           tal cual del input
 *   matriz              { valor: { "op_fila": "Alto" } }   fila → ETIQUETA de columna
 *   matriz múltiple     { valor: { "op_fila": ["A","B"] } }
 *   orden               { valor: ["op_3","op_1","op_2"] }  el orden elegido
 *   emparejamiento      { valor: { "op_a": "su pareja" } }
 *   clasificacion       { valor: { "op_a": "Grupo A" } }
 *   huecos              { valor: { "h1": "corriente" } }
 *   archivo             { valor: "https://…" }
 *
 * Dos detalles que parecen menores y no lo son:
 *
 *  · en `matriz` el valor es la **etiqueta** de la columna, no un índice ni un id.
 *    El calificador compara con `claveEmparejamiento`, que el autor escribe como
 *    texto de columna. Mandar un índice sería mandar siempre una respuesta
 *    incorrecta, y nadie lo notaría hasta ver las notas;
 *  · en `orden` el arreglo son los ids **en el orden elegido**, y el servidor lo
 *    compara con las opciones ordenadas por su campo `orden` interno, que no se
 *    publica. Por eso el runner nunca debe reordenar la lista que recibe: el
 *    backend ya la mezcló de forma determinista por intento.
 *
 * ── Lo que este archivo NO tiene ─────────────────────────────────────────────
 * Ningún campo de calificación. No hay `correcta`, ni `puntosObtenidos`, ni
 * `nota`, ni `aprobado`. No es una omisión: es la razón de que el cliente no pueda
 * influir en una nota ni por accidente.
 */

import type {
  PreguntaPublica,
  RespuestaEnviada,
  RespuestaPrevia,
  SeccionPublica,
} from './contract';
import { esPregunta, esTipoConocido, especificacionDe } from './question-types';
import { textoPlanoBreve, textoPlanoDe } from './rich-text';

/** Valor local de una respuesta, antes de convertirse en `RespuestaEnviada`. */
export interface ValorRespuesta {
  opciones?: string[];
  valor?: unknown;
}

export type MapaRespuestas = Record<string, ValorRespuesta>;

/** Métricas por pregunta que el servidor guarda para el informe del revisor. */
export interface MetricaPregunta {
  visitas: number;
  cambios: number;
  segundos: number;
}

export type MapaMetricas = Record<string, MetricaPregunta>;

/* ------------------------------ Preguntas ---------------------------------- */

export interface EntradaPregunta {
  seccion: SeccionPublica;
  pregunta: PreguntaPublica;
}

/** Todas las entradas del cuestionario en orden, contenido incluido. */
export function entradasDe(secciones: SeccionPublica[]): EntradaPregunta[] {
  return secciones.flatMap((seccion) =>
    seccion.preguntas.map((pregunta) => ({ seccion, pregunta })),
  );
}

/**
 * Preguntas que el candidato puede contestar.
 *
 * Se excluyen los bloques de contenido y los tipos que este runner no conoce. Un
 * tipo desconocido no se puede responder honestamente, así que tampoco cuenta
 * para el progreso ni bloquea el envío: contarlo dejaría una barra que nunca llega
 * al 100 % y un botón de enviar que nunca se activa.
 */
export function preguntasContestables(secciones: SeccionPublica[]): EntradaPregunta[] {
  return entradasDe(secciones).filter(
    ({ pregunta }) => esPregunta(pregunta.tipo) && esTipoConocido(pregunta.tipo),
  );
}

/** Preguntas que el runner no sabe dibujar, para avisar de forma explícita. */
export function preguntasDesconocidas(secciones: SeccionPublica[]): EntradaPregunta[] {
  return entradasDe(secciones).filter(({ pregunta }) => !esTipoConocido(pregunta.tipo));
}

/* -------------------------------- Vacío ------------------------------------ */

/**
 * ¿Está respondida?
 *
 * El cero y el `false` son respuestas válidas: `0` en una escala o en un importe
 * es información, y tratarlo como vacío es el error clásico de un `if (!valor)`.
 * Por eso la comprobación es explícita por tipo y no una coerción a booleano.
 */
export function estaRespondida(valor: ValorRespuesta | undefined): boolean {
  if (!valor) return false;
  if (valor.opciones && valor.opciones.length > 0) return true;

  const contenido = valor.valor;
  if (contenido === null || contenido === undefined || contenido === '') return false;
  if (typeof contenido === 'number') return Number.isFinite(contenido);
  if (typeof contenido === 'boolean') return true;
  if (Array.isArray(contenido)) return contenido.length > 0;
  if (typeof contenido === 'object') {
    // Un mapa cuenta como respondido cuando alguna celda tiene contenido: una
    // cuadrícula con todas las filas en blanco no está respondida aunque el
    // objeto exista.
    return Object.values(contenido as Record<string, unknown>).some((celda) => {
      if (celda === null || celda === undefined || celda === '') return false;
      if (Array.isArray(celda)) return celda.length > 0;
      return true;
    });
  }
  return String(contenido).trim() !== '';
}

/** Obligatorias sin responder, en orden de aparición. */
export function obligatoriasPendientes(
  secciones: SeccionPublica[],
  respuestas: MapaRespuestas,
): EntradaPregunta[] {
  return preguntasContestables(secciones).filter(
    ({ pregunta }) => pregunta.obligatoria && !estaRespondida(respuestas[pregunta.id]),
  );
}

/** Opcionales sin responder: se enseñan en la revisión, no bloquean nada. */
export function opcionalesOmitidas(
  secciones: SeccionPublica[],
  respuestas: MapaRespuestas,
): EntradaPregunta[] {
  return preguntasContestables(secciones).filter(
    ({ pregunta }) => !pregunta.obligatoria && !estaRespondida(respuestas[pregunta.id]),
  );
}

/* ------------------------------ Validación --------------------------------- */

/**
 * Problema de una respuesta concreta, para mostrarlo junto al campo.
 *
 * Se valida lo que el propio enunciado promete (mínimos, máximos, número de
 * selecciones, formato de correo) porque avisar aquí es infinitamente mejor que
 * un `VALIDATION_ERROR` genérico después de pulsar «Enviar». Lo que **no** se
 * valida es nada relacionado con acertar: eso no es asunto del cliente.
 */
export function problemaDeRespuesta(
  pregunta: PreguntaPublica,
  valor: ValorRespuesta | undefined,
): string | null {
  const spec = especificacionDe(pregunta.tipo);
  if (!spec || spec.clase !== 'pregunta') return null;

  const respondida = estaRespondida(valor);
  if (!respondida) return pregunta.obligatoria ? 'Esta pregunta es obligatoria.' : null;

  const config = pregunta.configuracion;

  if (spec.espera === 'opciones') {
    const elegidas = valor?.opciones?.length ?? 0;
    const minimo = numeroDe(config.minimoSelecciones);
    const maximo = numeroDe(config.maximoSelecciones);
    if (minimo !== null && elegidas < minimo) {
      return `Elige al menos ${minimo} ${minimo === 1 ? 'opción' : 'opciones'}.`;
    }
    if (maximo !== null && elegidas > maximo) {
      return `Elige como máximo ${maximo} ${maximo === 1 ? 'opción' : 'opciones'}.`;
    }
    return null;
  }

  if (spec.espera === 'texto') {
    const texto = String(valor?.valor ?? '');
    const minimo = numeroDe(config.minimoCaracteres);
    const maximo = numeroDe(config.maximoCaracteres);
    if (minimo !== null && texto.trim().length < minimo) {
      return `Escribe al menos ${minimo} caracteres.`;
    }
    if (maximo !== null && texto.length > maximo) {
      return `El máximo es ${maximo} caracteres.`;
    }
    if (pregunta.tipo === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto.trim())) {
      return 'Escribe un correo electrónico válido.';
    }
    const patron = typeof config.patron === 'string' ? config.patron : '';
    if (patron && !coincideConPatron(texto, patron)) {
      return 'El formato no es el esperado.';
    }
    return null;
  }

  if (spec.espera === 'numero' || spec.espera === 'escala') {
    const numero = Number(valor?.valor);
    if (!Number.isFinite(numero)) return 'Escribe un número.';
    const minimo = numeroDe(config.minimo);
    const maximo = numeroDe(config.maximo);
    if (minimo !== null && numero < minimo) return `El valor mínimo es ${minimo}.`;
    if (maximo !== null && numero > maximo) return `El valor máximo es ${maximo}.`;
    return null;
  }

  if (spec.espera === 'archivo') {
    const url = String(valor?.valor ?? '').trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return 'Pega un enlace que empiece por https://';
    return null;
  }

  return null;
}

function numeroDe(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Compara con el patrón que el autor configuró.
 *
 * Se compila dentro de un `try`: un patrón inválido escrito en el editor del ATS
 * no puede tumbar la pantalla del candidato. Si no compila, no se valida.
 */
function coincideConPatron(texto: string, patron: string): boolean {
  try {
    return new RegExp(patron).test(texto);
  } catch {
    return true;
  }
}

/* ------------------------------- Serialización ----------------------------- */

/**
 * Convierte el estado local en el arreglo que viaja al servidor.
 *
 * Sólo se mandan preguntas que existen en la prueba y que el runner sabe
 * responder, con el valor ya en la forma que el calificador espera. Las vacías
 * también viajan: el servidor necesita saber que se dejó en blanco para contarla
 * como «sin responder» en lugar de como «nunca mostrada».
 */
export function aRespuestasEnviadas(
  secciones: SeccionPublica[],
  respuestas: MapaRespuestas,
  metricas: MapaMetricas = {},
): RespuestaEnviada[] {
  const salida: RespuestaEnviada[] = [];
  for (const { pregunta } of preguntasContestables(secciones)) {
    const valor = respuestas[pregunta.id];
    const metrica = metricas[pregunta.id];
    const entrada: RespuestaEnviada = { preguntaId: pregunta.id };

    const spec = especificacionDe(pregunta.tipo);
    if (spec && (spec.espera === 'opcion' || spec.espera === 'opciones')) {
      entrada.opciones = valor?.opciones ?? [];
    } else if (valor?.valor !== undefined) {
      entrada.valor = normalizarValor(spec?.espera, valor.valor);
    }

    if (metrica) {
      if (metrica.segundos > 0) entrada.segundos = Math.round(metrica.segundos);
      if (metrica.visitas > 0) entrada.visitas = metrica.visitas;
      if (metrica.cambios > 0) entrada.cambios = metrica.cambios;
    }
    salida.push(entrada);
  }
  return salida;
}

/**
 * Última pasada sobre el valor antes de enviarlo.
 *
 * Los números viajan como números (el input los da como cadena), los textos
 * recortados, y los mapas sin celdas vacías: una fila de cuadrícula que el
 * candidato marcó y desmarcó no debe llegar como `""` y contarse como respondida.
 */
function normalizarValor(espera: string | undefined, valor: unknown): unknown {
  if (espera === 'numero' || espera === 'escala') {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
  if (typeof valor === 'string') return valor.trim();
  if (Array.isArray(valor)) return valor;
  if (valor && typeof valor === 'object') {
    const limpio: Record<string, unknown> = {};
    for (const [clave, celda] of Object.entries(valor as Record<string, unknown>)) {
      if (celda === null || celda === undefined || celda === '') continue;
      if (Array.isArray(celda)) {
        if (celda.length === 0) continue;
        limpio[clave] = celda;
        continue;
      }
      limpio[clave] = typeof celda === 'string' ? celda.trim() : celda;
    }
    return limpio;
  }
  return valor;
}

/**
 * Siembra el estado local con lo que el servidor ya tenía guardado.
 *
 * Se usa cuando `startAttempt` devuelve `retomado: true`. Sólo se aceptan
 * respuestas de preguntas que están en ESTA versión de la prueba: si el ATS
 * publicó una versión nueva entre dos visitas, arrastrar respuestas de la anterior
 * las asignaría a otras preguntas.
 */
export function sembrarRespuestas(
  secciones: SeccionPublica[],
  previas: RespuestaPrevia[],
): MapaRespuestas {
  const validas = new Set(preguntasContestables(secciones).map(({ pregunta }) => pregunta.id));
  const mapa: MapaRespuestas = {};
  for (const previa of previas) {
    if (!validas.has(previa.preguntaId)) continue;
    const entrada: ValorRespuesta = {};
    if (Array.isArray(previa.opciones) && previa.opciones.length > 0) {
      entrada.opciones = previa.opciones;
    }
    if (previa.valor !== null && previa.valor !== undefined && previa.valor !== '') {
      entrada.valor = previa.valor;
    }
    if (entrada.opciones || entrada.valor !== undefined) mapa[previa.preguntaId] = entrada;
  }
  return mapa;
}

/**
 * ¿El propio control ya muestra el enunciado?
 *
 * Pasa en «rellenar huecos» cuando los espacios están en el enunciado y no en una
 * plantilla aparte: el control dibuja la frase con los campos dentro, así que pintar
 * además el enunciado la repetiría dos veces seguidas. El texto sigue existiendo para
 * los lectores de pantalla —es el nombre de la pregunta—, sólo se oculta a la vista.
 */
export function enunciadoLoDibujaElControl(pregunta: PreguntaPublica): boolean {
  if (pregunta.tipo !== 'rellenar_huecos') return false;
  const plantilla = pregunta.configuracion.huecosTexto;
  if (typeof plantilla === 'string' && plantilla.trim() !== '') return false;
  return /_{2,}/.test(textoPlanoDe(pregunta.enunciado));
}

/** Etiqueta corta de una pregunta, para la lista de pendientes. */
export function etiquetaDePregunta(pregunta: PreguntaPublica, numero: number): string {
  const enunciado = textoPlanoBreve(pregunta.enunciado, 80);
  if (!enunciado) return `Pregunta ${numero}`;
  return numero > 0 ? `${numero}. ${enunciado}` : enunciado;
}
