/**
 * El contrato del backend de Evaluaciones, tipado.
 *
 * Fuente de verdad: `docs/evaluaciones/CONTRATO_FRONTEND.md` y
 * `apps-script/evaluaciones/*.gs` del repositorio del ATS
 * (`AlexD5427/Claude-bdp`), backend **2.0.0**, esquema de hojas **2**, snapshot
 * **2**, texto enriquecido **1**.
 *
 * ── Por qué este archivo existe ──────────────────────────────────────────────
 * La iteración anterior de este módulo se escribió contra un backend distinto:
 * envoltorio `{ ok, requestId, data, error:{code,message,details}, warnings }`,
 * acciones `getPublicAssessment` / `startAttempt` / `submitAttempt`, campos en
 * inglés. Ese backend ya no existe. El actual habla español, tiene cinco
 * acciones públicas y devuelve `{ ok, accion, solicitudId, datos, error, avisos,
 * meta }`. Ninguna llamada del módulo anterior podía funcionar: no era un fallo
 * de red ni de configuración, era un contrato equivocado de principio a fin.
 *
 * Aquí se declara el contrato UNA vez y todo lo demás se deriva de estos tipos,
 * para que un cambio en el ATS se note como un error de compilación y no como un
 * `undefined` a mitad de una prueba.
 *
 * ── Las tres invariantes del backend ─────────────────────────────────────────
 *  1. **El servidor manda.** El navegador nunca calcula una nota, nunca decide un
 *     estado y nunca ve una clave de respuesta.
 *  2. **La clave de respuestas jamás sale.** La proyección pública se construye
 *     campo por campo en el servidor (`13_Public.gs`).
 *  3. **El reloj es del servidor.** El límite se calcula al iniciar el intento y
 *     se recalcula en cada latido y en cada guardado.
 */

/* ========================================================================== */
/* Envoltorio                                                                 */
/* ========================================================================== */

/** Códigos de error del backend (`01_Errors.gs`). */
export const CODIGOS_BACKEND = [
  'BAD_REQUEST',
  'UNSUPPORTED_ACTION',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'FORBIDDEN',
  'RATE_LIMITED',
  'NOT_INSTALLED',
  'SCHEMA_ERROR',
  'BUSY',
  'EXPIRED',
  'INTERNAL_ERROR',
] as const;

export type CodigoBackend = (typeof CODIGOS_BACKEND)[number];

/**
 * Códigos que nacen en este cliente y nunca vienen por la red.
 *
 * Se mantienen separados de los del backend a propósito: mezclarlos haría
 * imposible saber, leyendo un registro, si el problema estuvo en el servidor o
 * antes de salir del navegador.
 */
export const CODIGOS_CLIENTE = [
  /** No se pudo contactar con el servidor (red, DNS, CORS, 5xx). */
  'TRANSPORTE',
  /** La petición se canceló o tardó más que el tiempo máximo. */
  'TIEMPO_AGOTADO',
  /** La URL del Web App falta o no puede ser la correcta. */
  'CONFIGURACION',
  /** El cuerpo de la respuesta no tiene la forma del contrato. */
  'RESPUESTA_INVALIDA',
] as const;

export type CodigoCliente = (typeof CODIGOS_CLIENTE)[number];

export type CodigoError = CodigoBackend | CodigoCliente;

/** Avisos que el backend adjunta a una respuesta correcta (`19_Router.gs`). */
export const AVISOS_CONOCIDOS = [
  'SOLICITUD_REPETIDA',
  'ADMIN_SIN_LLAVE',
  'LLAVE_EN_ROTACION',
] as const;

export type AvisoConocido = (typeof AVISOS_CONOCIDOS)[number];

/** Hallazgo de validación: `detalle.issues` de un `VALIDATION_ERROR`. */
export interface HallazgoValidacion {
  code: string;
  message: string;
  /** Ruta del campo, p. ej. `participante.documento`. */
  path: string;
  details: Record<string, unknown>;
}

export interface ErrorApi {
  codigo: string;
  mensaje: string;
  /** Qué hacer. Es lo que convierte un error en una instrucción. */
  pista: string;
  detalle: Record<string, unknown>;
  /** Identificador correlacionado con la hoja `Registro` del libro. */
  traza: string;
}

export interface MetaApi {
  traza: string;
  horaServidor: string;
  milisegundos: number;
  backend: string;
  esquema: number;
  textoEnriquecido: number;
  modoAuth: string;
  instalado?: boolean;
  contadores?: Record<string, number>;
}

export interface Envoltorio<T = unknown> {
  ok: boolean;
  accion: string;
  solicitudId: string;
  datos: T | null;
  error: ErrorApi | null;
  avisos: string[];
  meta: MetaApi;
}

/* ========================================================================== */
/* Texto enriquecido (modelo v1)                                              */
/* ========================================================================== */

export const BLOQUES_RICOS = ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'quote', 'code'] as const;
export type BloqueRicoTipo = (typeof BLOQUES_RICOS)[number];

export const MARCAS_RICAS = ['b', 'i', 'u', 's', 'c'] as const;
export type MarcaRica = (typeof MARCAS_RICAS)[number];

export interface FragmentoRico {
  /** Texto literal. Nunca HTML. */
  x: string;
  /** Marcas de la lista blanca. */
  m?: MarcaRica[];
  /** Enlace; solo `http`, `https` y `mailto` sobreviven al saneamiento. */
  l?: string;
}

export interface BloqueRico {
  t: BloqueRicoTipo;
  s: FragmentoRico[];
}

export interface DocRico {
  v: number;
  b: BloqueRico[];
}

/* ========================================================================== */
/* Proyección pública de una evaluación                                       */
/* ========================================================================== */

export type Navegacion = 'libre' | 'secuencial' | 'una_por_pagina';

export type VisibilidadResultado = 'nada' | 'solo_envio' | 'nota' | 'nota_y_detalle';

export type EstadoIntento = 'en_curso' | 'enviado' | 'expirado' | 'abandonado' | 'anulado';

/** Motivos por los que un código puede no estar disponible (`13_Public.gs`). */
export const MOTIVOS_INDISPONIBLE = [
  'no_publicada',
  'pausada',
  'cerrada',
  'no_disponible',
  'sin_version',
  'aun_no_abre',
  'ventana_cerrada',
  'codigo_vacio',
  'codigo_inexistente',
] as const;

export type MotivoIndisponible = (typeof MOTIVOS_INDISPONIBLE)[number];

export interface CampoParticipante {
  clave: string;
  etiqueta: string;
  obligatorio: boolean;
  activo: boolean;
}

/**
 * Política de integridad que el autor configuró.
 *
 * Se le anuncia al candidato ANTES de empezar. Una vigilancia silenciosa no es
 * aceptable y, además, no sirve como evidencia.
 */
export interface PoliticaIntegridad {
  registrarCambioPestana: boolean;
  registrarCopiaPegado: boolean;
  registrarTiempos: boolean;
  registrarNavegacion: boolean;
  bloquearPegado: boolean;
  bloquearMenuContextual: boolean;
  avisarAlSalir: boolean;
  pantallaCompletaSugerida: boolean;
  umbralRiesgo: number;
}

export type AcentoTema = 'cian' | 'azul' | 'indigo' | 'esmeralda' | 'violeta' | 'ambar';

export interface TemaEvaluacion {
  acento: AcentoTema;
  densidad: 'comoda' | 'compacta';
  portadaUrl: string;
  logoUrl: string;
  mostrarNumeracion: boolean;
  animaciones: boolean;
}

export interface OpcionPublica {
  id: string;
  valor: string;
  texto: DocRico;
  imagenUrl?: string;
  grupo?: string;
}

export interface MediosPregunta {
  imagenUrl?: string;
  videoUrl?: string;
  textoAlternativo?: string;
  pieDeFoto?: string;
}

export interface PreguntaPublica {
  id: string;
  tipo: string;
  enunciado: DocRico;
  ayuda: DocRico;
  obligatoria: boolean;
  /** Lista blanca de claves de presentación (`EV_PUBLIC_CONFIG_KEYS`). */
  configuracion: Record<string, unknown>;
  opciones: OpcionPublica[];
  medios?: MediosPregunta | null;
  accesibilidad?: { etiquetaAria?: string; descripcionLarga?: string };
  /**
   * Puntos que reparte la pregunta.
   *
   * SÍ se muestran al candidato: son el peso, no la clave. Solo llegan cuando el
   * autor los repartió.
   */
  puntos?: number;
}

export interface SeccionPublica {
  id: string;
  titulo: string;
  descripcion: DocRico;
  limiteSegundos: number | null;
  preguntas: PreguntaPublica[];
}

export interface AplicacionPublica {
  duracionMinutos: number | null;
  navegacion: Navegacion;
  permitirRetroceso: boolean;
  mostrarProgreso: boolean;
  autoenviarAlExpirar: boolean;
  guardadoAutomaticoSegundos: number;
}

/** La prueba completa. Solo llega dentro de `startAttempt`. */
export interface PruebaPublica {
  codigo: string;
  titulo: string;
  descripcion: string;
  instrucciones: DocRico;
  versionEtiqueta: string;
  totalPreguntas: number;
  aplicacion: AplicacionPublica;
  participante: {
    campos: CampoParticipante[];
    requiereConsentimiento: boolean;
    textoConsentimiento: string;
    visibilidadResultado: VisibilidadResultado;
  };
  integridad: PoliticaIntegridad;
  tema: TemaEvaluacion;
  secciones: SeccionPublica[];
}

/**
 * Portada: lo que `openAssessment` devuelve.
 *
 * **No trae preguntas.** Abrir el enlace no permite leer la prueba sin
 * empezarla, y por eso el backend puede cachear esta respuesta sin riesgo.
 */
export interface PortadaPublica {
  codigo: string;
  disponible: boolean;
  motivo: string;
  mensaje: string;
  titulo: string;
  horaServidor: string;
  descripcion?: string;
  instrucciones?: DocRico;
  versionEtiqueta?: string;
  totalPreguntas?: number;
  duracionMinutos?: number | null;
  intentosMaximos?: number;
  participante?: {
    campos: CampoParticipante[];
    requiereConsentimiento: boolean;
    textoConsentimiento: string;
  };
  integridad?: PoliticaIntegridad;
  tema?: TemaEvaluacion;
  ventanaFin?: string;
}

/* ========================================================================== */
/* Intento                                                                    */
/* ========================================================================== */

/**
 * Respuesta que el runner envía por pregunta.
 *
 * Este tipo **no tiene** campos de calificación, y eso es la defensa: el cliente
 * no puede enviar `correcta`, `puntosObtenidos`, `nota` ni `aprobado` ni por
 * accidente. El servidor los descartaría igual (`evStripClientScoring_`), pero
 * un tipo que no los admite es una garantía en tiempo de compilación.
 */
export interface RespuestaEnviada {
  preguntaId: string;
  opciones?: string[];
  valor?: unknown;
  segundos?: number;
  visitas?: number;
  cambios?: number;
}

export interface EventoEnviado {
  tipo: string;
  secuencia: number;
  ocurridoEn?: string;
  preguntaId?: string;
  segundosDesdeInicio?: number;
  duracionMs?: number;
  detalle?: Record<string, number | string>;
}

export interface RespuestaPrevia {
  preguntaId: string;
  opciones: string[];
  /** Ausente y `null` significan lo mismo: la pregunta quedó sin responder. */
  valor?: unknown;
}

export interface InicioIntento {
  intentoId: string;
  /** Credencial firmada (HMAC) del intento. Solo vive en memoria. */
  token: string;
  /** `true` cuando el candidato ya tenía un intento en curso. */
  retomado: boolean;
  horaServidor: string;
  iniciadoEn: string;
  /** ISO del límite, o cadena vacía cuando la prueba no tiene tiempo. */
  limiteEn: string;
  segundosRestantes: number | null;
  respuestasPrevias: RespuestaPrevia[];
  prueba: PruebaPublica;
}

export interface LatidoIntento {
  intentoId: string;
  estado: EstadoIntento;
  horaServidor: string;
  limiteEn: string;
  segundosRestantes: number | null;
  expirado: boolean;
  ultimoGuardadoEn: string;
}

export interface ProgresoGuardado {
  guardadoEn: string;
  respuestasGuardadas: number;
  horaServidor: string;
  segundosRestantes: number | null;
  expirado: boolean;
}

/**
 * Comprobante que el candidato ve al enviar.
 *
 * Los campos opcionales dependen de `visibilidadResultado`: con `solo_envio` o
 * `nada` el servidor NO manda la nota, y mostrar un cero en su lugar sería
 * mentir.
 */
export interface ComprobanteIntento {
  intentoId: string;
  evaluacion: string;
  estado: EstadoIntento;
  enviadoEn: string;
  envioAutomatico: boolean;
  /** El servidor reconoció un envío ya procesado y devolvió el original. */
  repetido: boolean;
  respuestasRegistradas: number;
  calificacionPendiente: boolean;
  segundosUsados: number;
  nota?: number | null;
  aprobado?: boolean | null;
  puntosObtenidos?: number | null;
  puntosPosibles?: number | null;
  correctas?: number;
  incorrectas?: number;
  sinResponder?: number;
}

/**
 * Respuesta del backend cuando reconoce un `solicitudId` ya procesado.
 *
 * ── El hallazgo que rompía el módulo anterior, y que sigue vigente ──────────
 * `19_Router.gs → evWithLock_` **no vuelve a ejecutar la acción** cuando el
 * `solicitudId` ya está en la hoja `Solicitudes`. Devuelve esto:
 *
 *   { repetida: true, referencia, procesadoEn, resumen }
 *
 * Ese cuerpo NO tiene la forma de `submitAttempt`. Un cliente que solo conozca
 * el caso feliz trata un reintento legítimo como respuesta malformada — justo el
 * camino que recorre un candidato con la red inestable. El cliente de este
 * módulo acepta las dos formas y hay pruebas para ambas.
 */
export interface RepeticionIdempotente {
  repetida: true;
  referencia: string;
  procesadoEn: string;
  resumen: Record<string, unknown>;
}

export function esRepeticionIdempotente(datos: unknown): datos is RepeticionIdempotente {
  return (
    typeof datos === 'object' &&
    datos !== null &&
    (datos as { repetida?: unknown }).repetida === true
  );
}

/* ========================================================================== */
/* Acciones                                                                   */
/* ========================================================================== */

/**
 * Las cinco acciones que el candidato puede ejecutar (`EV_PUBLIC_ACTIONS`).
 *
 * `ping` existe y es pública, pero este módulo no la usa: sirve al panel de
 * conexión del ATS. Ninguna acción administrativa se nombra en todo el módulo, y
 * hay una prueba estática que lo verifica leyendo los archivos.
 */
export const ACCIONES_CANDIDATO = {
  abrir: 'openAssessment',
  iniciar: 'startAttempt',
  latido: 'heartbeat',
  guardar: 'saveProgress',
  enviar: 'submitAttempt',
} as const;

export type AccionCandidato = (typeof ACCIONES_CANDIDATO)[keyof typeof ACCIONES_CANDIDATO];

/**
 * Acciones de solo lectura (`EV_READ_ACTIONS`).
 *
 * No consumen `solicitudId` y se pueden reintentar sin consecuencias. Es la
 * única razón por la que el transporte puede reintentar unas y no otras.
 */
export const ACCIONES_LECTURA: ReadonlySet<string> = new Set<AccionCandidato>([
  ACCIONES_CANDIDATO.abrir,
  ACCIONES_CANDIDATO.latido,
]);
