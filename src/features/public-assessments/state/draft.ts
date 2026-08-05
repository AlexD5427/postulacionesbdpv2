'use client';

/**
 * Borrador local de las respuestas.
 *
 * ── Qué problema resuelve, exactamente ───────────────────────────────────────
 * El progreso de verdad vive en el servidor: `saveProgress` lo guarda cada veinte
 * segundos y `startAttempt` lo devuelve al retomar. Este borrador cubre la ventana
 * que queda entre dos guardados: si alguien recarga por accidente justo después de
 * responder tres preguntas, sin esto pierde esas tres.
 *
 * ── Lo que NO se guarda, y por qué ──────────────────────────────────────────
 *  · **El nombre ni el carnet.** No hacen falta: al volver a identificarse el
 *    servidor retoma el intento por documento y devuelve todo. Guardarlos sería
 *    dejar datos personales en el equipo, quizá compartido, sin ninguna ganancia.
 *  · **El token del intento.** Es una credencial. Guardarla permitiría reanudar sin
 *    identificarse, lo cual suena cómodo hasta que se piensa en un cibercafé. El
 *    camino correcto ya existe y es mejor: volver a escribir el número identificador.
 *
 * ── Por qué `sessionStorage` y no `localStorage` ────────────────────────────
 * Muere con la pestaña. Un borrador de evaluación que sobrevive días en un equipo
 * compartido es un problema de privacidad, no una comodidad.
 *
 * El borrador está acotado por **versión publicada**: si el ATS publicó una versión
 * nueva entre dos visitas, se descarta en lugar de asignar respuestas viejas a
 * preguntas nuevas. Y caduca a las seis horas.
 */

import { logger } from '@/core/observability/logger';
import type { MapaRespuestas } from '../domain/answers';

const PREFIJO = 'bdp.ev.borrador.';
const VIGENCIA_MS = 6 * 60 * 60 * 1000;
/** Sube al cambiar la forma del borrador; invalida los antiguos sin migrarlos. */
const FORMATO = 2;

export interface Borrador {
  formato: number;
  codigo: string;
  intentoId: string;
  versionEtiqueta: string;
  respuestas: MapaRespuestas;
  guardadoEn: number;
}

function clave(intentoId: string): string {
  return `${PREFIJO}${intentoId}`;
}

function almacen(): Storage | null {
  try {
    // En el servidor no existe; en un navegador con almacenamiento bloqueado, el
    // acceso lanza. En los dos casos la respuesta correcta es «no hay borrador», no
    // una excepción que tumbe el runner.
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function guardarBorrador(borrador: Omit<Borrador, 'formato' | 'guardadoEn'>): void {
  const store = almacen();
  if (!store) return;
  try {
    const completo: Borrador = { ...borrador, formato: FORMATO, guardadoEn: Date.now() };
    store.setItem(clave(borrador.intentoId), JSON.stringify(completo));
  } catch (error) {
    // Cuota agotada o modo privado restrictivo. El progreso real está en el
    // servidor, así que no perder esto no es grave; se anota y se sigue.
    logger.debug('evaluaciones: no se pudo guardar el borrador local', {
      motivo: error instanceof Error ? error.name : 'desconocido',
    });
  }
}

/**
 * Recupera el borrador si sigue siendo aplicable.
 *
 * Devuelve `null` en cuanto algo no cuadra —otro formato, otra versión, otro código,
 * caducado— y borra lo que ya no sirve. Un borrador «casi» aplicable es peor que
 * ninguno: mezclaría respuestas de dos versiones de la prueba.
 */
export function cargarBorrador(
  intentoId: string,
  codigo: string,
  versionEtiqueta: string,
): MapaRespuestas | null {
  const store = almacen();
  if (!store) return null;
  try {
    const bruto = store.getItem(clave(intentoId));
    if (!bruto) return null;
    const analizado = JSON.parse(bruto) as Partial<Borrador>;

    const aplicable =
      analizado.formato === FORMATO &&
      analizado.codigo === codigo &&
      analizado.versionEtiqueta === versionEtiqueta &&
      typeof analizado.guardadoEn === 'number' &&
      Date.now() - analizado.guardadoEn < VIGENCIA_MS &&
      analizado.respuestas !== null &&
      typeof analizado.respuestas === 'object';

    if (!aplicable) {
      store.removeItem(clave(intentoId));
      return null;
    }
    return analizado.respuestas as MapaRespuestas;
  } catch {
    store.removeItem(clave(intentoId));
    return null;
  }
}

/** Se llama al enviar con éxito: el borrador ya no tiene nada que aportar. */
export function borrarBorrador(intentoId: string): void {
  const store = almacen();
  if (!store) return;
  try {
    store.removeItem(clave(intentoId));
  } catch {
    // Nada que hacer; el borrador muere con la pestaña de todos modos.
  }
}
