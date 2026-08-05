/**
 * Lectura del envoltorio y normalización de códigos.
 *
 * El backend responde SIEMPRE con la misma forma, también cuando falla:
 *
 *   { ok, accion, solicitudId, datos, error, avisos, meta }
 *
 * Y `meta` viaja incluso en los errores, con la traza, la versión del backend y el
 * modo de autorización.
 *
 * ── Por qué se analiza a mano en lugar de confiar ────────────────────────────
 * El fallo más frecuente y menos informativo del módulo anterior era «no se puede
 * leer la propiedad de undefined», y venía siempre del mismo sitio: una respuesta
 * con otra forma propagándose por la aplicación. Cuando la URL apunta a una
 * pantalla de inicio de sesión de Google, la respuesta es HTML; cuando apunta a
 * otro Web App, es un JSON con otras claves. En los dos casos hay que decir qué
 * pasó, no reventar tres componentes más allá.
 */

import {
  CODIGOS_BACKEND,
  type CodigoBackend,
  type CodigoError,
  type Envoltorio,
  type MetaApi,
} from '../domain/contract';

const META_VACIA: MetaApi = {
  traza: '',
  horaServidor: '',
  milisegundos: 0,
  backend: '',
  esquema: 0,
  textoEnriquecido: 0,
  modoAuth: '',
};

/**
 * Versión de esquema de hojas contra la que se escribió este cliente.
 *
 * No se usa para rechazar: un backend con esquema 3 puede seguir sirviendo estas
 * cinco acciones sin cambios, y bloquear el módulo por precaución dejaría a los
 * candidatos fuera por una diferencia que quizá no les afecta. Se registra la
 * discrepancia para que quien opera la vea antes de que alguien se queje.
 */
export const ESQUEMA_ESPERADO = 2;

/** ¿Es uno de los códigos que el backend declara? */
function esCodigoBackend(bruto: string): bruto is CodigoBackend {
  return (CODIGOS_BACKEND as readonly string[]).includes(bruto);
}

/** Código del backend, o `INTERNAL_ERROR` si es uno que no conocemos. */
export function normalizarCodigo(bruto: unknown): CodigoError {
  const texto = String(bruto ?? '');
  return esCodigoBackend(texto) ? texto : 'INTERNAL_ERROR';
}

export type LecturaEnvoltorio<T> =
  | { ok: true; envoltorio: Envoltorio<T> }
  | { ok: false; diagnostico: string; muestra: string };

/**
 * Normaliza cualquier cosa que llegue por la red a un envoltorio.
 *
 * Devuelve un resultado en lugar de lanzar porque el transporte necesita
 * distinguir «el backend contestó un error de negocio» (que es una respuesta
 * válida y no se reintenta) de «esto no es el backend» (que sí puede merecer otro
 * intento y, sobre todo, otro mensaje).
 */
export function leerEnvoltorio<T>(bruto: unknown, muestra = ''): LecturaEnvoltorio<T> {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    return {
      ok: false,
      diagnostico:
        'El servidor respondió algo que no es un objeto JSON. Suele significar que la URL apunta a una pantalla de inicio de sesión de Google: el despliegue del Web App debe permitir acceso a «cualquier usuario».',
      muestra,
    };
  }

  const candidato = bruto as Record<string, unknown>;
  if (typeof candidato.ok !== 'boolean') {
    return {
      ok: false,
      diagnostico:
        'La respuesta no tiene la forma del backend de Evaluaciones (falta `ok`). Suele significar que la URL apunta a otro Web App, o que el despliegue no se actualizó después de copiar los archivos .gs.',
      muestra,
    };
  }

  const errorBruto =
    candidato.error && typeof candidato.error === 'object' && !Array.isArray(candidato.error)
      ? (candidato.error as Record<string, unknown>)
      : null;

  return {
    ok: true,
    envoltorio: {
      ok: candidato.ok,
      accion: typeof candidato.accion === 'string' ? candidato.accion : '',
      solicitudId: typeof candidato.solicitudId === 'string' ? candidato.solicitudId : '',
      datos: (candidato.datos ?? null) as T | null,
      error: errorBruto
        ? {
            codigo: String(errorBruto.codigo ?? ''),
            mensaje: String(errorBruto.mensaje ?? ''),
            pista: String(errorBruto.pista ?? ''),
            detalle:
              errorBruto.detalle && typeof errorBruto.detalle === 'object'
                ? (errorBruto.detalle as Record<string, unknown>)
                : {},
            traza: String(errorBruto.traza ?? ''),
          }
        : null,
      avisos: Array.isArray(candidato.avisos) ? candidato.avisos.map(String) : [],
      meta: { ...META_VACIA, ...((candidato.meta as Partial<MetaApi> | undefined) ?? {}) },
    },
  };
}

/** ¿El servidor reconoció un `solicitudId` ya procesado? */
export function huboRepeticion(envoltorio: Envoltorio<unknown>): boolean {
  return envoltorio.avisos.includes('SOLICITUD_REPETIDA');
}

/**
 * Un `solicitudId` nuevo.
 *
 * Se crea UNA vez por intención del usuario y se reutiliza literalmente en cada
 * reintento de esa misma intención. Un id nuevo al reintentar crearía un segundo
 * intento o un segundo envío: es el único mecanismo de idempotencia que hay y vive
 * en el cliente.
 */
export function nuevaSolicitudId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Identificador estable de este navegador.
 *
 * El backend lo guarda como `ultimo_cliente` y lo usa para no confundir dos
 * guardados de la misma pestaña con un conflicto entre dos personas. En la
 * superficie del candidato no cumple ese papel (no hay concurrencia sobre una
 * evaluación), pero mandarlo mantiene la auditoría del libro completa y cuesta un
 * campo.
 *
 * No es identidad ni seguimiento: es un valor aleatorio que muere con la pestaña.
 */
let clienteMemoria = '';

export function clienteId(): string {
  if (clienteMemoria) return clienteMemoria;
  clienteMemoria = `cli_${Math.random().toString(36).slice(2, 12)}`;
  return clienteMemoria;
}
