/**
 * El error del módulo, y qué se le dice al candidato.
 *
 * ── Dos audiencias, dos textos ───────────────────────────────────────────────
 * El backend devuelve `mensaje`, `pista`, `detalle` y `traza`. Todo eso es
 * valiosísimo para quien opera el portal y **casi nada** de eso sirve a un
 * candidato: puede nombrar entidades internas, hojas de cálculo o propiedades del
 * script.
 *
 * Así que el error lleva las dos cosas:
 *  · `mensajeCandidato`, seguro de mostrar, escrito para alguien que solo quiere
 *    rendir su prueba;
 *  · `mensaje` y `pista` del servidor, que se registran (redactados) y se enseñan
 *    únicamente cuando son accionables por el propio candidato.
 *
 * ── Qué se muestra y qué no ──────────────────────────────────────────────────
 * El módulo anterior optó por ocultar SIEMPRE el mensaje del servidor. Eso
 * resolvía la fuga de información y creaba otro problema: «Esta evaluación no está
 * disponible» para un plazo vencido, para una evaluación pausada y para un código
 * mal escrito. Tres situaciones con tres acciones distintas y una sola frase.
 *
 * Aquí se distingue por `detalle.motivo`, que el backend adjunta precisamente para
 * esto (`EV_MOTIVO_TEXTO` en `13_Public.gs`). El backend ya decidió qué es seguro
 * contarle a un candidato: se respeta esa decisión en lugar de sustituirla por una
 * más pobre. Lo que nunca se muestra es un error de infraestructura.
 */

import type { CodigoError, ErrorApi, HallazgoValidacion } from '../domain/contract';

export class ErrorEvaluaciones extends Error {
  readonly codigo: CodigoError;
  /** Texto seguro de mostrar a un candidato. */
  readonly mensajeCandidato: string;
  /** Qué hacer, cuando el servidor lo dice y es accionable por el candidato. */
  readonly pista: string;
  readonly detalle: Record<string, unknown>;
  /** Identificador correlacionado con la hoja `Registro` del libro. */
  readonly traza: string;
  readonly hallazgos: HallazgoValidacion[];
  /** Diagnóstico para quien opera. Nunca se pinta en pantalla. */
  readonly diagnostico: string;

  constructor(
    codigo: CodigoError,
    opciones: {
      mensajeCandidato?: string;
      pista?: string;
      detalle?: Record<string, unknown>;
      traza?: string;
      hallazgos?: HallazgoValidacion[];
      diagnostico?: string;
      cause?: unknown;
    } = {},
  ) {
    super(opciones.diagnostico ?? codigo);
    this.name = 'ErrorEvaluaciones';
    this.codigo = codigo;
    this.mensajeCandidato = opciones.mensajeCandidato ?? MENSAJE_POR_CODIGO[codigo];
    this.pista = opciones.pista ?? '';
    this.detalle = opciones.detalle ?? {};
    this.traza = opciones.traza ?? '';
    this.hallazgos = opciones.hallazgos ?? [];
    this.diagnostico = opciones.diagnostico ?? '';
    if (opciones.cause !== undefined) this.cause = opciones.cause;
  }
}

/**
 * Texto de respaldo por código.
 *
 * Se usa cuando el servidor no dijo nada mejor. Cada frase termina en algo que el
 * candidato puede hacer, porque un mensaje sin salida solo genera una llamada al
 * banco.
 */
const MENSAJE_POR_CODIGO: Record<CodigoError, string> = {
  BAD_REQUEST: 'No pudimos procesar la solicitud. Vuelve a intentarlo.',
  UNSUPPORTED_ACTION: 'Ocurrió un problema técnico. Inténtalo de nuevo más tarde.',
  VALIDATION_ERROR: 'Revisa los datos marcados y vuelve a intentarlo.',
  NOT_FOUND: 'Esta evaluación no está disponible.',
  CONFLICT: 'Esta evaluación ya no admite cambios.',
  FORBIDDEN: 'No tienes acceso a esta evaluación en este momento.',
  RATE_LIMITED:
    'Hay muchas personas abriendo esta evaluación al mismo tiempo. Espera un minuto y vuelve a intentarlo.',
  NOT_INSTALLED: 'El servicio de evaluaciones no está disponible temporalmente.',
  SCHEMA_ERROR: 'El servicio de evaluaciones no está disponible temporalmente.',
  BUSY: 'El servicio está atendiendo otra operación. Espera unos segundos y vuelve a intentarlo.',
  EXPIRED: 'El plazo de esta evaluación ya terminó.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.',
  TRANSPORTE:
    'No pudimos conectarnos con el servicio de evaluaciones. Revisa tu conexión e inténtalo de nuevo.',
  TIEMPO_AGOTADO: 'La conexión tardó demasiado. Revisa tu red y vuelve a intentarlo.',
  CONFIGURACION: 'El servicio de evaluaciones no está disponible temporalmente.',
  RESPUESTA_INVALIDA: 'El servicio de evaluaciones no está disponible temporalmente.',
};

/**
 * Códigos en los que el `mensaje` del backend está escrito PARA el candidato.
 *
 * `13_Public.gs` y `16_Attempts.gs` redactan sus mensajes pensando en quien va a
 * rendir la prueba («El plazo de esta evaluación ya terminó», «Ya realizaste esta
 * evaluación y solo se permite un intento»). Ocultarlos y poner una frase genérica
 * empeora el producto sin mejorar la seguridad: ninguno revela nada que el
 * candidato no pueda deducir del propio enlace.
 *
 * Los códigos de infraestructura (`INTERNAL_ERROR`, `SCHEMA_ERROR`,
 * `NOT_INSTALLED`, `BAD_REQUEST`, `UNSUPPORTED_ACTION`) quedan fuera: sus mensajes
 * hablan de hojas, columnas y propiedades del script.
 */
const CODIGOS_CON_MENSAJE_PUBLICO: ReadonlySet<CodigoError> = new Set<CodigoError>([
  'NOT_FOUND',
  'FORBIDDEN',
  'CONFLICT',
  'EXPIRED',
  'RATE_LIMITED',
  'VALIDATION_ERROR',
  'BUSY',
]);

/** Traduce el error del envoltorio a un error del módulo. */
export function desdeErrorApi(bruto: ErrorApi, codigo: CodigoError): ErrorEvaluaciones {
  const detalle = bruto.detalle ?? {};
  const hallazgos = Array.isArray((detalle as { issues?: unknown }).issues)
    ? ((detalle as { issues: HallazgoValidacion[] }).issues satisfies HallazgoValidacion[])
    : [];

  const usarMensajeDelServidor =
    CODIGOS_CON_MENSAJE_PUBLICO.has(codigo) && bruto.mensaje.trim() !== '';

  return new ErrorEvaluaciones(codigo, {
    mensajeCandidato: usarMensajeDelServidor ? bruto.mensaje : MENSAJE_POR_CODIGO[codigo],
    pista: usarMensajeDelServidor ? bruto.pista : '',
    detalle,
    traza: bruto.traza,
    hallazgos,
    diagnostico: `${bruto.codigo}: ${bruto.mensaje}`,
  });
}

/** Mensaje seguro para cualquier cosa que llegue a un `catch`. */
export function mensajeParaCandidato(error: unknown): string {
  if (error instanceof ErrorEvaluaciones) return error.mensajeCandidato;
  return MENSAJE_POR_CODIGO.INTERNAL_ERROR;
}

/** Pista del servidor, cuando existe y es accionable por el candidato. */
export function pistaParaCandidato(error: unknown): string {
  return error instanceof ErrorEvaluaciones ? error.pista : '';
}

/**
 * ¿El motivo de indisponibilidad es transitorio?
 *
 * Una evaluación pausada o que aún no abre volverá; una cerrada o inexistente no.
 * La diferencia decide si la pantalla ofrece «Volver a comprobar» o no, y ofrecer
 * ese botón cuando no sirve de nada es peor que no ofrecerlo.
 */
export function esIndisponibilidadTransitoria(motivo: string): boolean {
  return motivo === 'pausada' || motivo === 'aun_no_abre' || motivo === 'sin_version';
}

/** ¿Merece la pena ofrecer un reintento? */
export function admiteReintento(error: unknown): boolean {
  if (!(error instanceof ErrorEvaluaciones)) return false;
  return (
    error.codigo === 'TRANSPORTE' ||
    error.codigo === 'TIEMPO_AGOTADO' ||
    error.codigo === 'BUSY' ||
    error.codigo === 'RATE_LIMITED' ||
    error.codigo === 'INTERNAL_ERROR'
  );
}

/** ¿Es un problema de configuración del portal y no del candidato? */
export function esProblemaDeConfiguracion(error: unknown): boolean {
  return (
    error instanceof ErrorEvaluaciones &&
    (error.codigo === 'CONFIGURACION' ||
      error.codigo === 'NOT_INSTALLED' ||
      error.codigo === 'RESPUESTA_INVALIDA')
  );
}
