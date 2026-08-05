/**
 * Transporte HTTP hacia el Web App de Evaluaciones.
 *
 * ── Tres reglas que Apps Script impone y que aquí se cumplen en un solo sitio ─
 *
 *  1. **`redirect: 'follow'`.** Google contesta `302` al Web App y el cuerpo vive
 *     detrás de la redirección. Sin seguirla, la llamada falla con un `404`
 *     desconcertante que parece un despliegue borrado.
 *
 *  2. **`Content-Type: text/plain;charset=utf-8`.** Un Web App de Apps Script no
 *     puede contestar el *preflight* de CORS que dispararía `application/json`.
 *     Con `text/plain` la petición es «simple» y el navegador no lo pide. El
 *     cuerpo sigue siendo JSON; sólo cambia la etiqueta.
 *
 *  3. **Un `solicitudId` único por intención, y el MISMO al reintentar.** Es el
 *     único mecanismo de idempotencia que existe. Un id nuevo al reintentar crea
 *     un segundo intento o un segundo envío.
 *
 * Además: `credentials: 'omit'` (es un tercero: no viaja ninguna cookie) y
 * `cache: 'no-store'`.
 *
 * ── Política de reintentos ───────────────────────────────────────────────────
 * Las **lecturas** se reintentan con retroceso: son idempotentes por definición y
 * no consumen `solicitudId`. Las **escrituras no se reintentan solas, nunca**.
 * Aunque el servidor sea idempotente, un reintento automático esconde el problema
 * de red que conviene ver, y convierte un envío en una operación cuyo número de
 * ejecuciones nadie puede contar. Quien reintenta es la persona, con un botón, y
 * el mismo `solicitudId`.
 *
 * Un error de negocio (`ok: false`) es una respuesta **válida** y no se reintenta:
 * repetir «el plazo ya terminó» tres veces no lo cambia.
 */

import { logger } from '@/core/observability/logger';
import { ACCIONES_LECTURA, type Envoltorio } from '../domain/contract';
import { endpointEvaluaciones } from './endpoint';
import { clienteId, leerEnvoltorio, normalizarCodigo } from './envelope';
import { desdeErrorApi, ErrorEvaluaciones } from './errors';

/** Tiempo máximo de una lectura. Corto: si no contesta, se reintenta. */
const TIMEOUT_LECTURA_MS = 15_000;
/**
 * Tiempo máximo de una escritura.
 *
 * Más generoso porque `submitAttempt` califica la prueba completa dentro de la
 * petición: con sesenta preguntas y cuadrículas, Apps Script puede tardar varios
 * segundos. Cortar aquí a los quince segundos dejaría al candidato viendo un error
 * mientras el servidor guarda su intento correctamente, que es el peor de los
 * mundos.
 */
const TIMEOUT_ESCRITURA_MS = 45_000;

const REINTENTOS_LECTURA = 2;
const RETROCESO_MS = [600, 1400] as const;

export interface OpcionesPeticion {
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface CuerpoPeticion {
  accion: string;
  solicitudId: string;
  cliente: string;
  payload: Record<string, unknown>;
}

export interface ResultadoTransporte<T> {
  datos: T | null;
  /** El servidor devolvió el resultado original de un `solicitudId` repetido. */
  repetida: boolean;
  avisos: string[];
  envoltorio: Envoltorio<T>;
}

function conTimeout(externa: AbortSignal | undefined, timeoutMs: number) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  if (externa) {
    if (externa.aborted) controlador.abort();
    else externa.addEventListener('abort', () => controlador.abort(), { once: true });
  }
  return { signal: controlador.signal, limpiar: () => clearTimeout(temporizador) };
}

/**
 * Traduce un fallo de red a un error con diagnóstico.
 *
 * Los modos de fallo que se ven en la práctica son distintos entre sí y exigen
 * acciones distintas de quien opera. Agruparlos todos en «no se pudo conectar» es
 * exactamente lo que hacía perder horas buscando el problema donde no estaba.
 */
function errorDeTransporte(error: unknown, cancelacionExterna: boolean): ErrorEvaluaciones {
  if (cancelacionExterna) {
    return new ErrorEvaluaciones('TIEMPO_AGOTADO', {
      diagnostico: 'la petición se canceló desde el cliente',
    });
  }
  const mensaje = error instanceof Error ? error.message : String(error);

  if (/^HTTP 40[13]$/.test(mensaje)) {
    return new ErrorEvaluaciones('CONFIGURACION', {
      diagnostico:
        'Google rechazó la solicitud antes de llegar al script. El despliegue del Web App debe tener «Quién tiene acceso: cualquier usuario» (Implementar → Gestionar implementaciones).',
      cause: error,
    });
  }
  if (mensaje === 'HTTP 404') {
    return new ErrorEvaluaciones('CONFIGURACION', {
      diagnostico:
        'La dirección del backend no existe. Comprueba que la URL termina en /exec y corresponde al despliegue actual: cada implementación nueva genera su propia URL.',
      cause: error,
    });
  }
  if (/^HTTP 5\d\d$/.test(mensaje)) {
    return new ErrorEvaluaciones('INTERNAL_ERROR', {
      diagnostico:
        'El script devolvió un error del servidor. Abre el libro y ejecuta ⚙️ Evaluaciones → Diagnóstico: dirá si falta la estructura o la autorización.',
      cause: error,
    });
  }
  if (/abort/i.test(mensaje)) {
    return new ErrorEvaluaciones('TIEMPO_AGOTADO', {
      diagnostico: 'la petición superó el tiempo máximo',
      cause: error,
    });
  }
  return new ErrorEvaluaciones('TRANSPORTE', {
    diagnostico: `no se pudo contactar con el Web App de Evaluaciones (${mensaje})`,
    cause: error,
  });
}

/** Una ida y vuelta. Lanza {@link ErrorEvaluaciones} en cualquier fallo. */
async function enviar<T>(
  cuerpo: CuerpoPeticion,
  opciones: OpcionesPeticion,
  timeoutMs: number,
): Promise<ResultadoTransporte<T>> {
  const endpoint = endpointEvaluaciones();
  if (endpoint.estado !== 'listo') {
    logger.error('evaluaciones: endpoint mal configurado', { diagnostico: endpoint.diagnostico });
    throw new ErrorEvaluaciones('CONFIGURACION', { diagnostico: endpoint.diagnostico });
  }

  const { signal, limpiar } = conTimeout(opciones.signal, timeoutMs);
  let texto: string;
  try {
    const respuesta = await fetch(endpoint.url, {
      method: 'POST',
      // Regla 1 — Google contesta 302 y el cuerpo vive detrás de la redirección.
      redirect: 'follow',
      // Regla 2 — evita el preflight de CORS que el despliegue no puede contestar.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
      // Endpoint de terceros: nunca viaja una cookie del portal.
      credentials: 'omit',
      cache: 'no-store',
      signal,
    });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    // Se lee como texto y se analiza a mano para poder distinguir «el backend
    // contestó un error de negocio» (JSON) de «Google devolvió una página»
    // (HTML). Con `respuesta.json()` los dos casos son la misma excepción.
    texto = await respuesta.text();
  } catch (error) {
    limpiar();
    if (error instanceof ErrorEvaluaciones) throw error;
    throw errorDeTransporte(error, opciones.signal?.aborted === true);
  }
  limpiar();

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', {
      diagnostico:
        'El servidor respondió con algo que no es JSON. Casi siempre significa que la URL apunta a una pantalla de inicio de sesión de Google: el despliegue debe permitir acceso anónimo.',
      detalle: { primerosCaracteres: texto.slice(0, 160) },
    });
  }

  const lectura = leerEnvoltorio<T>(bruto, texto.slice(0, 160));
  if (!lectura.ok) {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', {
      diagnostico: lectura.diagnostico,
      detalle: { primerosCaracteres: lectura.muestra },
    });
  }

  const { envoltorio } = lectura;
  if (!envoltorio.ok) {
    const codigo = normalizarCodigo(envoltorio.error?.codigo);
    // El mensaje del backend puede nombrar entidades internas, así que se registra
    // (el `logger` redacta) y sólo se muestra cuando el propio backend lo escribió
    // para el candidato. Ver `errors.ts`.
    logger.warn('evaluaciones: acción rechazada', {
      accion: cuerpo.accion,
      codigo,
      traza: envoltorio.error?.traza ?? '',
    });
    throw desdeErrorApi(
      envoltorio.error ?? { codigo, mensaje: '', pista: '', detalle: {}, traza: '' },
      codigo,
    );
  }

  return {
    datos: envoltorio.datos,
    repetida: envoltorio.avisos.includes('SOLICITUD_REPETIDA'),
    avisos: envoltorio.avisos,
    envoltorio,
  };
}

/**
 * Lectura idempotente, con reintentos ante fallos transitorios.
 *
 * Va con `solicitudId` vacío: el backend sólo consume identificadores en las
 * escrituras (`EV_READ_ACTIONS` no toma bloqueo ni registra la solicitud), y
 * mandar uno haría que la segunda lectura pareciera una repetición.
 */
export async function leer<T>(
  accion: string,
  payload: Record<string, unknown> = {},
  opciones: OpcionesPeticion = {},
): Promise<ResultadoTransporte<T>> {
  if (!ACCIONES_LECTURA.has(accion)) {
    // No es una comprobación decorativa: mandar una escritura por este camino la
    // reintentaría automáticamente, que es justo lo que no debe pasar.
    throw new ErrorEvaluaciones('BAD_REQUEST', {
      diagnostico: `«${accion}» no es una acción de lectura; usa escribir().`,
    });
  }

  let ultimo: ErrorEvaluaciones = new ErrorEvaluaciones('TRANSPORTE');
  for (let intento = 0; intento <= REINTENTOS_LECTURA; intento += 1) {
    try {
      return await enviar<T>(
        { accion, solicitudId: '', cliente: clienteId(), payload },
        opciones,
        opciones.timeoutMs ?? TIMEOUT_LECTURA_MS,
      );
    } catch (error) {
      if (!(error instanceof ErrorEvaluaciones)) throw error;
      // Sólo el transporte se reintenta. La configuración y los códigos de negocio
      // son terminales: reintentarlos gasta tiempo del candidato para nada.
      if (error.codigo !== 'TRANSPORTE') throw error;
      ultimo = error;
      if (opciones.signal?.aborted) break;
      const espera = RETROCESO_MS[intento];
      if (intento < REINTENTOS_LECTURA && espera !== undefined) {
        await new Promise((resolver) => setTimeout(resolver, espera));
      }
    }
  }
  throw ultimo;
}

/**
 * Escritura. **Nunca** se reintenta aquí.
 *
 * `solicitudId` es obligatorio y pertenece a quien llama: se crea una vez por
 * intención del usuario y se reutiliza literalmente en cada reintento manual.
 */
export async function escribir<T>(
  accion: string,
  solicitudId: string,
  payload: Record<string, unknown> = {},
  opciones: OpcionesPeticion = {},
): Promise<ResultadoTransporte<T>> {
  if (!solicitudId) {
    throw new ErrorEvaluaciones('BAD_REQUEST', {
      diagnostico: `la escritura «${accion}» viajaba sin solicitudId`,
    });
  }
  return enviar<T>(
    { accion, solicitudId, cliente: clienteId(), payload },
    opciones,
    opciones.timeoutMs ?? TIMEOUT_ESCRITURA_MS,
  );
}
