/**
 * Cliente tipado de las cinco acciones del candidato.
 *
 * Es la ÚNICA superficie que el resto del módulo usa: ningún componente construye
 * una petición ni conoce el nombre de una acción. Cambiar el contrato es cambiar
 * este archivo, y eso es lo que permite que un cambio en el ATS se note como un
 * error de compilación aquí y no como una pantalla en blanco allí.
 *
 * ── Ninguna acción administrativa ────────────────────────────────────────────
 * `EV_ADMIN_ACTIONS` del backend tiene veintidós acciones (listar evaluaciones,
 * publicar, ver intentos, calificar, exportar…). Ninguna se nombra en este módulo,
 * y ninguna llamada lleva `llaveAdmin`: el navegador de un candidato no puede tener
 * una llave que no necesita. `security.test.ts` lo comprueba leyendo los archivos.
 */

import type {
  ComprobanteIntento,
  EventoEnviado,
  InicioIntento,
  LatidoIntento,
  PortadaPublica,
  ProgresoGuardado,
  RespuestaEnviada,
} from '../domain/contract';
import { ACCIONES_CANDIDATO, esRepeticionIdempotente } from '../domain/contract';
import { esModoDemostracion } from './endpoint';
import { ErrorEvaluaciones } from './errors';
import { ESQUEMAS, leerDatos } from './payloads';
import { escribir, leer, type OpcionesPeticion } from './transport';
import { backendDemostracion } from './demo';

export { nuevaSolicitudId } from './envelope';

/** Datos del participante que el backend pide, ya normalizados. */
export interface DatosParticipante {
  nombre: string;
  /** Carnet de identidad: la primera parte del número identificador. */
  documento: string;
  /**
   * Número identificador completo (`CI-Proceso-Año`).
   *
   * Viaja por dos caminos a propósito, y los dos acaban en la hoja `Intentos`:
   * como `procesoId` en la raíz del payload (columna `proceso_id`, que
   * `evStartAttempt_` escribe **siempre**) y como campo `proceso` del participante
   * (columna `participante_json`, sólo si el autor activó ese campo). La columna es
   * la garantía; el campo es la comodidad de verlo junto al resto de los datos.
   */
  numeroIdentificador: string;
  /** Campos extra que el autor haya activado (`correo`, `telefono`, `cargo`…). */
  extra?: Record<string, string>;
}

/**
 * ¿Se usa el backend local de demostración?
 *
 * Se resuelve en cada llamada y no una sola vez al cargar el módulo: en las
 * pruebas el entorno cambia entre casos, y memorizarlo obligaría a un `reset`
 * global que es exactamente el tipo de estado compartido que hace que una suite
 * falle según el orden.
 */
function usarDemostracion(): boolean {
  return esModoDemostracion();
}

/* ------------------------------ openAssessment ---------------------------- */

/**
 * Portada de la evaluación, ANTES de crear el intento.
 *
 * No trae preguntas: abrir el enlace no permite leer la prueba sin empezarla. Es
 * una lectura, así que el transporte la reintenta si la red falla.
 */
export async function abrirEvaluacion(
  codigo: string,
  opciones: OpcionesPeticion = {},
): Promise<PortadaPublica> {
  if (usarDemostracion()) return backendDemostracion.abrir(codigo);

  const respuesta = await leer<unknown>(ACCIONES_CANDIDATO.abrir, { codigo }, opciones);
  const lectura = leerDatos(ACCIONES_CANDIDATO.abrir, ESQUEMAS.portada, respuesta.datos);
  if (!lectura.ok) {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', { diagnostico: lectura.diagnostico });
  }
  return lectura.valor;
}

/* -------------------------------- startAttempt ---------------------------- */

/**
 * Crea el intento (o retoma el que hubiera) y devuelve la prueba completa.
 *
 * Si el candidato ya tenía un intento en curso con el mismo documento, el backend
 * devuelve `retomado: true` con el MISMO `intentoId`, su tiempo restante real y sus
 * `respuestasPrevias`. Recargar la página no reinicia nada, y por eso este módulo
 * no necesita guardar el token en ningún sitio: volver a identificarse recupera el
 * intento.
 */
export async function iniciarIntento(
  codigo: string,
  participante: DatosParticipante,
  extra: {
    consentimiento?: boolean;
    zonaHoraria?: string;
    agenteUsuario?: string;
    solicitudId: string;
  },
  opciones: OpcionesPeticion = {},
): Promise<InicioIntento> {
  const payload = {
    codigo,
    participante: {
      nombre: participante.nombre,
      documento: participante.documento,
      // El backend sólo conserva los campos que el autor activó; mandar el número
      // identificador como `proceso` es gratis y evita tener que pedirle al
      // reclutador que active nada para verlo.
      proceso: participante.numeroIdentificador,
      ...(participante.extra ?? {}),
    },
    // Raíz del payload: `evStartAttempt_` la escribe en `Intentos.proceso_id`
    // pase lo que pase con la configuración de campos.
    procesoId: participante.numeroIdentificador,
    consentimiento: extra.consentimiento === true,
    zonaHoraria: extra.zonaHoraria ?? '',
    agenteUsuario: extra.agenteUsuario ?? '',
  };

  if (usarDemostracion()) return backendDemostracion.iniciar(codigo, payload);

  const respuesta = await escribir<unknown>(
    ACCIONES_CANDIDATO.iniciar,
    extra.solicitudId,
    payload,
    opciones,
  );

  /**
   * Repetición idempotente en `startAttempt`.
   *
   * Ocurre cuando el candidato pulsa «Comenzar» dos veces o reintenta tras un
   * corte: el backend reconoce el `solicitudId` y devuelve `{ repetida: true, … }`
   * en lugar de la prueba. Ese cuerpo no sirve para empezar, pero el intento SÍ
   * existe. La salida correcta es pedir un `solicitudId` nuevo y volver a llamar:
   * el backend encontrará el intento en curso por documento y lo retomará, con su
   * tiempo real y sus respuestas. Reintentar con el mismo id daría la misma
   * repetición para siempre.
   */
  if (esRepeticionIdempotente(respuesta.datos)) {
    throw new ErrorEvaluaciones('CONFLICT', {
      mensajeCandidato: 'Ya habías empezado esta evaluación. Vamos a recuperar tu intento.',
      detalle: { repeticionDeInicio: true },
      diagnostico: 'startAttempt devolvió una repetición idempotente; hay que reintentar con un solicitudId nuevo',
    });
  }

  const lectura = leerDatos(ACCIONES_CANDIDATO.iniciar, ESQUEMAS.inicio, respuesta.datos);
  if (!lectura.ok) {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', { diagnostico: lectura.diagnostico });
  }
  return lectura.valor;
}

/** ¿El error indica que hay que reintentar el inicio con un identificador nuevo? */
export function esRepeticionDeInicio(error: unknown): boolean {
  return (
    error instanceof ErrorEvaluaciones && error.detalle.repeticionDeInicio === true
  );
}

/* --------------------------------- heartbeat ------------------------------ */

/**
 * Latido: sincroniza el reloj con el servidor y detecta la expiración.
 *
 * Es una LECTURA en el backend (no toma bloqueo ni consume identificador), y por
 * eso llamarla cada veinte segundos no cuesta nada. El navegador cuenta hacia atrás
 * entre latidos sólo para mover el reloj en pantalla; la verdad la trae esto.
 */
export async function latido(
  intentoId: string,
  token: string,
  opciones: OpcionesPeticion = {},
): Promise<LatidoIntento> {
  if (usarDemostracion()) return backendDemostracion.latido(intentoId, token);

  const respuesta = await leer<unknown>(
    ACCIONES_CANDIDATO.latido,
    { intentoId, token },
    { ...opciones, timeoutMs: opciones.timeoutMs ?? 10_000 },
  );
  const lectura = leerDatos(ACCIONES_CANDIDATO.latido, ESQUEMAS.latido, respuesta.datos);
  if (!lectura.ok) {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', { diagnostico: lectura.diagnostico });
  }
  return lectura.valor;
}

/* ------------------------------- saveProgress ----------------------------- */

/**
 * Guarda el progreso en el servidor, sin calificar.
 *
 * Es idempotente por pregunta (el identificador de cada respuesta es determinista:
 * `evAnswerId_(intento, pregunta)`), así que reenviar el mismo lote no duplica
 * filas ni pierde nada. Por eso el autoguardado puede volver a mandar todo el
 * cuestionario cada vez en lugar de llevar la cuenta de qué cambió: la
 * contabilidad de deltas es donde se pierden respuestas.
 */
export async function guardarProgreso(
  intentoId: string,
  token: string,
  respuestas: RespuestaEnviada[],
  eventos: EventoEnviado[],
  solicitudId: string,
  opciones: OpcionesPeticion = {},
): Promise<ProgresoGuardado> {
  if (usarDemostracion()) {
    return backendDemostracion.guardar(intentoId, token, respuestas, eventos);
  }

  const respuesta = await escribir<unknown>(
    ACCIONES_CANDIDATO.guardar,
    solicitudId,
    { intentoId, token, respuestas, eventos },
    opciones,
  );

  // Un autoguardado repetido no es un problema: lo guardado sigue guardado. Se
  // devuelve un resultado neutro para que la interfaz no muestre un error por algo
  // que salió bien.
  if (esRepeticionIdempotente(respuesta.datos)) {
    return {
      guardadoEn: respuesta.datos.procesadoEn,
      respuestasGuardadas: respuestas.length,
      horaServidor: respuesta.envoltorio.meta.horaServidor,
      segundosRestantes: null,
      expirado: false,
    };
  }

  const lectura = leerDatos(ACCIONES_CANDIDATO.guardar, ESQUEMAS.progreso, respuesta.datos);
  if (!lectura.ok) {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', { diagnostico: lectura.diagnostico });
  }
  return lectura.valor;
}

/* ------------------------------- submitAttempt ---------------------------- */

/**
 * Cierra y califica el intento. Devuelve el comprobante.
 *
 * ── El caso que rompía el módulo anterior ────────────────────────────────────
 * Cuando el servidor reconoce un `solicitudId` ya procesado,
 * `19_Router.gs → evWithLock_` **no vuelve a ejecutar la acción**: responde
 * `{ repetida: true, referencia, procesadoEn, resumen }`. Ese cuerpo no tiene la
 * forma del comprobante, así que un cliente que sólo conozca el caso feliz trata un
 * reintento legítimo como respuesta malformada — justo el camino de un candidato
 * con red inestable, que es el que más necesita que funcione.
 *
 * Aquí se aceptan las dos formas. En la repetición se construye un comprobante
 * honesto: se sabe el identificador del intento y su estado, y **no** se inventa
 * una nota. Mostrar un cero porque el campo no vino sería mentirle a alguien sobre
 * su propia evaluación.
 */
export async function enviarIntento(
  intentoId: string,
  token: string,
  respuestas: RespuestaEnviada[],
  eventos: EventoEnviado[],
  automatico: boolean,
  solicitudId: string,
  opciones: OpcionesPeticion = {},
): Promise<ComprobanteIntento> {
  if (usarDemostracion()) {
    return backendDemostracion.enviar(intentoId, token, respuestas, eventos, automatico);
  }

  const respuesta = await escribir<unknown>(
    ACCIONES_CANDIDATO.enviar,
    solicitudId,
    { intentoId, token, respuestas, eventos, automatico },
    opciones,
  );

  if (esRepeticionIdempotente(respuesta.datos)) {
    return comprobanteDesdeRepeticion(intentoId, respuesta.datos, automatico);
  }

  const lectura = leerDatos(ACCIONES_CANDIDATO.enviar, ESQUEMAS.comprobante, respuesta.datos);
  if (!lectura.ok) {
    throw new ErrorEvaluaciones('RESPUESTA_INVALIDA', { diagnostico: lectura.diagnostico });
  }
  return lectura.valor;
}

/**
 * Comprobante a partir de una repetición idempotente.
 *
 * `resumen` es lo que el servicio guardó al procesar la solicitud original
 * (`{ intentoId, estado, nota }` en `submitAttempt`). Se aprovecha lo que haya y
 * nada más: sin `nota` no hay nota, y `calificacionPendiente` queda en `false`
 * porque no se sabe y afirmarlo sería inventar. Lo único que se afirma con
 * seguridad es lo importante: el envío ya está registrado.
 */
function comprobanteDesdeRepeticion(
  intentoId: string,
  repeticion: { referencia: string; procesadoEn: string; resumen: Record<string, unknown> },
  automatico: boolean,
): ComprobanteIntento {
  const resumen = repeticion.resumen ?? {};
  const estado = typeof resumen.estado === 'string' ? resumen.estado : 'enviado';
  const nota = typeof resumen.nota === 'number' ? resumen.nota : null;

  return {
    intentoId: repeticion.referencia || intentoId,
    evaluacion: '',
    estado:
      estado === 'expirado' || estado === 'anulado' || estado === 'abandonado' ? estado : 'enviado',
    enviadoEn: repeticion.procesadoEn ?? '',
    envioAutomatico: automatico,
    repetido: true,
    respuestasRegistradas: 0,
    calificacionPendiente: false,
    segundosUsados: 0,
    ...(nota !== null ? { nota } : {}),
  };
}
