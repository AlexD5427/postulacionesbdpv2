/**
 * Validación y saneamiento de lo que el servidor devuelve.
 *
 * Dos capas, en este orden, y el orden importa:
 *
 *  1. **Borrar lo prohibido.** Se eliminan recursivamente las claves que jamás
 *     deben llegar a un navegador sin credenciales. Va PRIMERO porque si va
 *     después de validar, un esquema permisivo (`passthrough`) ya habría dejado el
 *     dato dentro del objeto tipado y el borrado sería cosmético.
 *  2. **Validar la forma.** Zod convierte «el servidor mandó otra cosa» en un
 *     error explícito en lugar de un `undefined` que revienta cuatro componentes
 *     más allá.
 *
 * ── Sobre la primera capa ────────────────────────────────────────────────────
 * `13_Public.gs` construye la proyección pública campo por campo con lista blanca,
 * así que en un backend correcto esta capa nunca borra nada. Existe igualmente por
 * una razón concreta: el portal no controla qué versión del script está desplegada.
 * Un despliegue viejo, un archivo `.gs` copiado a medias o un `evPublicQuestion_`
 * modificado a mano pueden filtrar la clave de respuestas, y el resultado sería
 * que las respuestas correctas viajan al navegador de quien está rindiendo la
 * prueba. Es un coste de unos microsegundos por una garantía que no depende de
 * otro repositorio.
 *
 * Cuando algo se borra, se registra como **defecto del backend** con los nombres de
 * las claves —nunca sus valores— para que quien opera pueda arreglar el despliegue.
 */

import { z } from 'zod';
import { logger } from '@/core/observability/logger';
import { sanearDocRico } from '../domain/rich-text';
import type {
  ComprobanteIntento,
  InicioIntento,
  LatidoIntento,
  PortadaPublica,
  ProgresoGuardado,
} from '../domain/contract';

/* ========================================================================== */
/* Capa 1 · claves que no pueden llegar al navegador                          */
/* ========================================================================== */

/**
 * Todo lo que revelaría la clave de respuestas o la política de calificación.
 *
 * `puntos` **no** está en la lista, y es deliberado: son el peso de la pregunta,
 * no la respuesta. El backend los publica a propósito porque el candidato tiene
 * derecho a saber cuánto vale cada pregunta.
 */
export const CLAVES_PROHIBIDAS = [
  // Clave de respuestas.
  'correcta',
  'correctas',
  'claveEmparejamiento',
  'respuestaEsperada',
  'huecosClave',
  'retroalimentacion',
  // Política de calificación.
  'modoPuntaje',
  'penalizacion',
  'puntajeAprobacion',
  'criterioAprobacion',
  'puntosTotales',
  'preguntasCalificables',
  'rubrica',
  'rubricas',
  // Uso interno del ATS.
  'notasInternas',
  'notasRevision',
  'reglas',
  'creadoPor',
  'actualizadoPor',
  'revision',
  'ultimoCliente',
  'evaluacionId',
  'versionId',
] as const;

const PROHIBIDAS = new Set<string>(CLAVES_PROHIBIDAS);

/**
 * Borra recursivamente las claves prohibidas y devuelve las que encontró.
 *
 * Se recorre en profundidad porque una clave de respuesta vive dentro de
 * `secciones[].preguntas[].opciones[]`, no en la raíz. El límite de profundidad
 * evita que una estructura cíclica o patológica cuelgue la pestaña.
 */
export function quitarClavesProhibidas(entrada: unknown): {
  valor: unknown;
  encontradas: string[];
} {
  const encontradas = new Set<string>();

  const recorrer = (nodo: unknown, profundidad: number): unknown => {
    if (profundidad > 12 || nodo === null || typeof nodo !== 'object') return nodo;
    if (Array.isArray(nodo)) return nodo.map((elemento) => recorrer(elemento, profundidad + 1));

    const salida: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      if (PROHIBIDAS.has(clave)) {
        encontradas.add(clave);
        continue;
      }
      salida[clave] = recorrer(valor, profundidad + 1);
    }
    return salida;
  };

  return { valor: recorrer(entrada, 0), encontradas: [...encontradas] };
}

/* ========================================================================== */
/* Capa 2 · esquemas                                                          */
/* ========================================================================== */

/**
 * Texto enriquecido: se acepta cualquier cosa y se sanea **aquí**.
 *
 * Dos decisiones en una línea:
 *
 *  · No se valida con un esquema estricto. Un bloque con un tipo nuevo invalidaría
 *    la evaluación completa, y lo correcto ante un formato que no se reconoce del
 *    todo es degradarlo a párrafo, que es lo que hace `sanearDocRico`.
 *  · Se sanea en la frontera, no al pintar. Así ningún componente recibe nunca un
 *    documento sin sanear: no hay forma de olvidarse de llamar al saneador, porque
 *    el tipo que sale de aquí ya es un `DocRico` válido. Un `l: "javascript:…"`
 *    desaparece antes de que exista un solo nodo de React.
 */
const docRico = z.unknown().transform((valor) => sanearDocRico(valor));

const campoParticipante = z.object({
  clave: z.string(),
  etiqueta: z.string().default(''),
  obligatorio: z.boolean().default(false),
  activo: z.boolean().default(true),
});

const politicaIntegridad = z
  .object({
    registrarCambioPestana: z.boolean().default(true),
    registrarCopiaPegado: z.boolean().default(true),
    registrarTiempos: z.boolean().default(true),
    registrarNavegacion: z.boolean().default(true),
    bloquearPegado: z.boolean().default(false),
    bloquearMenuContextual: z.boolean().default(false),
    avisarAlSalir: z.boolean().default(true),
    pantallaCompletaSugerida: z.boolean().default(false),
    umbralRiesgo: z.number().default(5),
  })
  .default({});

const tema = z
  .object({
    acento: z
      .enum(['cian', 'azul', 'indigo', 'esmeralda', 'violeta', 'ambar'])
      .catch('cian')
      .default('cian'),
    densidad: z.enum(['comoda', 'compacta']).catch('comoda').default('comoda'),
    portadaUrl: z.string().default(''),
    logoUrl: z.string().default(''),
    mostrarNumeracion: z.boolean().default(true),
    animaciones: z.boolean().default(true),
  })
  .default({});

const opcionPublica = z.object({
  id: z.string().min(1),
  valor: z.string().default(''),
  texto: docRico,
  imagenUrl: z.string().optional(),
  grupo: z.string().optional(),
});

const preguntaPublica = z.object({
  id: z.string().min(1),
  tipo: z.string().min(1),
  enunciado: docRico,
  ayuda: docRico,
  obligatoria: z.boolean().default(false),
  configuracion: z.record(z.string(), z.unknown()).default({}),
  opciones: z.array(opcionPublica).default([]),
  medios: z
    .object({
      imagenUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      textoAlternativo: z.string().optional(),
      pieDeFoto: z.string().optional(),
    })
    .nullable()
    .optional(),
  accesibilidad: z
    .object({
      etiquetaAria: z.string().optional(),
      descripcionLarga: z.string().optional(),
    })
    .optional(),
  puntos: z.number().optional(),
});

const seccionPublica = z.object({
  id: z.string().min(1),
  titulo: z.string().default(''),
  descripcion: docRico,
  limiteSegundos: z.number().nullable().default(null),
  preguntas: z.array(preguntaPublica).default([]),
});

const aplicacionPublica = z.object({
  duracionMinutos: z.number().nullable().default(null),
  navegacion: z.enum(['libre', 'secuencial', 'una_por_pagina']).catch('libre').default('libre'),
  permitirRetroceso: z.boolean().default(true),
  mostrarProgreso: z.boolean().default(true),
  autoenviarAlExpirar: z.boolean().default(true),
  guardadoAutomaticoSegundos: z.number().default(20),
});

const pruebaPublica = z.object({
  codigo: z.string().default(''),
  titulo: z.string().default(''),
  descripcion: z.string().default(''),
  instrucciones: docRico,
  versionEtiqueta: z.string().default(''),
  totalPreguntas: z.number().default(0),
  aplicacion: aplicacionPublica,
  participante: z.object({
    campos: z.array(campoParticipante).default([]),
    requiereConsentimiento: z.boolean().default(false),
    textoConsentimiento: z.string().default(''),
    visibilidadResultado: z
      .enum(['nada', 'solo_envio', 'nota', 'nota_y_detalle'])
      .catch('solo_envio')
      .default('solo_envio'),
  }),
  integridad: politicaIntegridad,
  tema,
  secciones: z.array(seccionPublica).default([]),
});

const portadaPublica = z.object({
  codigo: z.string().default(''),
  disponible: z.boolean(),
  motivo: z.string().default(''),
  mensaje: z.string().default(''),
  titulo: z.string().default(''),
  horaServidor: z.string().default(''),
  descripcion: z.string().optional(),
  instrucciones: docRico.optional(),
  versionEtiqueta: z.string().optional(),
  totalPreguntas: z.number().optional(),
  duracionMinutos: z.number().nullable().optional(),
  intentosMaximos: z.number().optional(),
  participante: z
    .object({
      campos: z.array(campoParticipante).default([]),
      requiereConsentimiento: z.boolean().default(false),
      textoConsentimiento: z.string().default(''),
    })
    .optional(),
  integridad: politicaIntegridad.optional(),
  tema: tema.optional(),
  ventanaFin: z.string().optional(),
});

const inicioIntento = z.object({
  intentoId: z.string().min(1),
  token: z.string().min(1),
  retomado: z.boolean().default(false),
  horaServidor: z.string().default(''),
  iniciadoEn: z.string().default(''),
  limiteEn: z.string().default(''),
  segundosRestantes: z.number().nullable().default(null),
  respuestasPrevias: z
    .array(
      z.object({
        preguntaId: z.string(),
        opciones: z.array(z.string()).default([]),
        // `z.unknown()` es opcional por naturaleza en TypeScript, y forzarlo a
        // requerido aquí sólo añadiría ruido: `valor` ausente y `valor: null`
        // significan lo mismo (sin responder).
        valor: z.unknown(),
      }),
    )
    .default([]),
  prueba: pruebaPublica,
});

const latidoIntento = z.object({
  intentoId: z.string().default(''),
  estado: z
    .enum(['en_curso', 'enviado', 'expirado', 'abandonado', 'anulado'])
    .catch('en_curso')
    .default('en_curso'),
  horaServidor: z.string().default(''),
  limiteEn: z.string().default(''),
  segundosRestantes: z.number().nullable().default(null),
  expirado: z.boolean().default(false),
  ultimoGuardadoEn: z.string().default(''),
});

const progresoGuardado = z.object({
  guardadoEn: z.string().default(''),
  respuestasGuardadas: z.number().default(0),
  horaServidor: z.string().default(''),
  segundosRestantes: z.number().nullable().default(null),
  expirado: z.boolean().default(false),
});

const comprobanteIntento = z.object({
  intentoId: z.string().min(1),
  evaluacion: z.string().default(''),
  estado: z
    .enum(['en_curso', 'enviado', 'expirado', 'abandonado', 'anulado'])
    .catch('enviado')
    .default('enviado'),
  enviadoEn: z.string().default(''),
  envioAutomatico: z.boolean().default(false),
  repetido: z.boolean().default(false),
  respuestasRegistradas: z.number().default(0),
  calificacionPendiente: z.boolean().default(false),
  segundosUsados: z.number().default(0),
  nota: z.number().nullable().optional(),
  aprobado: z.boolean().nullable().optional(),
  puntosObtenidos: z.number().nullable().optional(),
  puntosPosibles: z.number().nullable().optional(),
  correctas: z.number().optional(),
  incorrectas: z.number().optional(),
  sinResponder: z.number().optional(),
});

export const ESQUEMAS = {
  portada: portadaPublica,
  inicio: inicioIntento,
  latido: latidoIntento,
  progreso: progresoGuardado,
  comprobante: comprobanteIntento,
} as const;

/* ========================================================================== */
/* Las dos capas juntas                                                       */
/* ========================================================================== */

export type ResultadoLectura<T> =
  | { ok: true; valor: T }
  | { ok: false; diagnostico: string };

/**
 * Sanea, valida y devuelve el dato tipado.
 *
 * `accion` sólo se usa para el registro: es lo que permite saber en qué respuesta
 * apareció una fuga o una forma inesperada sin adivinar.
 */
export function leerDatos<S extends z.ZodTypeAny>(
  accion: string,
  esquema: S,
  bruto: unknown,
): ResultadoLectura<z.infer<S>> {
  const { valor, encontradas } = quitarClavesProhibidas(bruto);

  if (encontradas.length > 0) {
    // Sólo los NOMBRES. Registrar el valor de `correcta` sería filtrar la clave de
    // respuestas al sitio más público que existe: la consola del navegador.
    logger.error('evaluaciones: el backend expuso claves privadas y se descartaron', {
      accion,
      claves: encontradas,
    });
  }

  const analizado = esquema.safeParse(valor);
  if (!analizado.success) {
    const rutas = analizado.error.issues
      .slice(0, 6)
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`);
    return {
      ok: false,
      diagnostico: `La respuesta de ${accion} no encaja con el contrato. ${rutas.join(' · ')}`,
    };
  }
  return { ok: true, valor: analizado.data };
}

/** Tipos derivados, para comprobar que los esquemas y el contrato no divergen. */
export type PortadaValidada = z.infer<typeof portadaPublica>;
export type InicioValidado = z.infer<typeof inicioIntento>;
export type LatidoValidado = z.infer<typeof latidoIntento>;
export type ProgresoValidado = z.infer<typeof progresoGuardado>;
export type ComprobanteValidado = z.infer<typeof comprobanteIntento>;

/**
 * Comprobaciones de asignabilidad.
 *
 * Si un esquema y su interfaz del contrato dejan de coincidir, esto falla al
 * compilar. Es la forma más barata de mantener sincronizados `contract.ts` (lo que
 * el ATS promete) y este archivo (lo que se acepta de verdad).
 */
const _comprobaciones = {
  portada: (valor: PortadaValidada): PortadaPublica => valor,
  inicio: (valor: InicioValidado): InicioIntento => valor,
  latido: (valor: LatidoValidado): LatidoIntento => valor,
  progreso: (valor: ProgresoValidado): ProgresoGuardado => valor,
  comprobante: (valor: ComprobanteValidado): ComprobanteIntento => valor,
};
void _comprobaciones;
