import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El cliente traduce el contrato en cinco funciones. Estas pruebas cubren lo que no
 * es evidente: qué pasa cuando el servidor reconoce un `solicitudId` que ya procesó.
 *
 * ── El hallazgo ─────────────────────────────────────────────────────────────
 * `19_Router.gs → evWithLock_` **no vuelve a ejecutar la acción** cuando el
 * identificador ya está en la hoja `Solicitudes`: devuelve
 * `{ repetida, referencia, procesadoEn, resumen }`. Ese cuerpo no tiene la forma del
 * comprobante, así que un cliente que sólo conozca el caso feliz trata un reintento
 * legítimo como respuesta malformada — justo el camino de un candidato con red
 * inestable, que es el que más necesita que funcione.
 */

vi.mock('./endpoint', () => ({
  endpointEvaluaciones: () => ({
    estado: 'listo',
    url: 'https://script.google.com/macros/s/PRUEBA/exec',
    diagnostico: '',
  }),
  esModoDemostracion: () => false,
}));

import {
  abrirEvaluacion,
  enviarIntento,
  esRepeticionDeInicio,
  guardarProgreso,
  iniciarIntento,
} from './client';

function envoltorio(datos: unknown, avisos: string[] = []) {
  return {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          ok: true,
          accion: 'x',
          solicitudId: 'req_1',
          datos,
          error: null,
          avisos,
          meta: { traza: 'tz', horaServidor: '2026-08-05T10:00:00Z', backend: '2.0.0', esquema: 2 },
        }),
      ),
  };
}

const REPETICION = {
  repetida: true,
  referencia: 'in_original',
  procesadoEn: '2026-08-05T09:59:00Z',
  resumen: { intentoId: 'in_original', estado: 'enviado' },
};

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function cuerpoDeLaLlamada(indice = 0): Record<string, unknown> {
  const [, opciones] = fetchSimulado.mock.calls[indice] as [string, RequestInit];
  return JSON.parse(String(opciones.body)) as Record<string, unknown>;
}

/* ========================================================================== */

describe('el número identificador llega a la hoja de cálculo', () => {
  const prueba = {
    codigo: 'EV-X',
    titulo: 'T',
    descripcion: '',
    instrucciones: { v: 1, b: [] },
    versionEtiqueta: 'v1.0',
    totalPreguntas: 0,
    aplicacion: {
      duracionMinutos: 30,
      navegacion: 'libre',
      permitirRetroceso: true,
      mostrarProgreso: true,
      autoenviarAlExpirar: true,
      guardadoAutomaticoSegundos: 20,
    },
    participante: { campos: [], requiereConsentimiento: false, textoConsentimiento: '' },
    integridad: {},
    tema: {},
    secciones: [],
  };

  /**
   * La columna `proceso_id` de la hoja `Intentos` la escribe `evStartAttempt_` a partir
   * de `payload.procesoId`, **siempre**, sin depender de que el autor haya activado
   * ningún campo opcional. Por eso el número identificador viaja ahí: es la garantía
   * de que queda registrado.
   */
  it('manda el carnet como documento y el número completo como procesoId', async () => {
    fetchSimulado.mockResolvedValue(
      envoltorio({
        intentoId: 'in_1',
        token: 'v1.tok',
        retomado: false,
        horaServidor: '',
        iniciadoEn: '',
        limiteEn: '',
        segundosRestantes: 1800,
        respuestasPrevias: [],
        prueba,
      }),
    );

    await iniciarIntento(
      'EV-X',
      { nombre: 'Ana Quispe', documento: '1234567', numeroIdentificador: '1234567-12-2026' },
      { solicitudId: 'req_inicio' },
    );

    const cuerpo = cuerpoDeLaLlamada();
    const payload = cuerpo.payload as Record<string, unknown>;
    const participante = payload.participante as Record<string, unknown>;

    expect(participante.nombre).toBe('Ana Quispe');
    // `participante_documento`: con lo que el backend reconoce a quien vuelve y aplica
    // el límite de intentos.
    expect(participante.documento).toBe('1234567');
    // `participante_json.proceso`, si el autor activó el campo.
    expect(participante.proceso).toBe('1234567-12-2026');
    // `Intentos.proceso_id`: la garantía, siempre.
    expect(payload.procesoId).toBe('1234567-12-2026');
  });

  it('no manda ninguna llave de administración con los datos del participante', async () => {
    fetchSimulado.mockResolvedValue(envoltorio(REPETICION));
    await iniciarIntento(
      'EV-X',
      { nombre: 'A', documento: '1', numeroIdentificador: '1-1-2026' },
      { solicitudId: 'req_1' },
    ).catch(() => undefined);
    const cuerpo = cuerpoDeLaLlamada();
    expect(cuerpo).not.toHaveProperty('llaveAdmin');
    expect(JSON.stringify(cuerpo)).not.toContain('adminKey');
  });
});

/* ========================================================================== */

describe('repetición idempotente en startAttempt', () => {
  /**
   * Un segundo clic en «Comenzar» o un reintento tras un corte. El intento SÍ existe,
   * pero la respuesta no sirve para empezar. La salida correcta es pedir un
   * identificador nuevo: el backend encontrará el intento en curso por documento y lo
   * retomará. Reintentar con el mismo identificador devolvería la misma repetición
   * para siempre.
   */
  it('se reconoce como tal, para poder reintentar con un identificador nuevo', async () => {
    fetchSimulado.mockResolvedValue(envoltorio(REPETICION, ['SOLICITUD_REPETIDA']));

    const error = await iniciarIntento(
      'EV-X',
      { nombre: 'A', documento: '1', numeroIdentificador: '1-1-2026' },
      { solicitudId: 'req_repetido' },
    ).catch((e) => e);

    expect(esRepeticionDeInicio(error)).toBe(true);
    // Y el mensaje explica lo que pasa de verdad, no un error genérico.
    expect(error.mensajeCandidato).toMatch(/ya habías empezado/i);
  });
});

/* ========================================================================== */

describe('repetición idempotente en submitAttempt', () => {
  it('construye un comprobante válido en lugar de fallar', async () => {
    fetchSimulado.mockResolvedValue(envoltorio(REPETICION, ['SOLICITUD_REPETIDA']));

    const comprobante = await enviarIntento('in_1', 'v1.tok', [], [], false, 'req_envio');

    expect(comprobante.repetido).toBe(true);
    // La referencia del servidor manda sobre el identificador local.
    expect(comprobante.intentoId).toBe('in_original');
    expect(comprobante.estado).toBe('enviado');
    expect(comprobante.enviadoEn).toBe('2026-08-05T09:59:00Z');
  });

  /**
   * Lo más importante de este caso. En una repetición el servidor no manda la nota, y
   * la tentación es rellenarla con un cero. Sería decirle a alguien que sacó 0 en su
   * evaluación por un problema de red.
   */
  it('NO inventa una nota cuando el resumen no la trae', async () => {
    fetchSimulado.mockResolvedValue(envoltorio(REPETICION, ['SOLICITUD_REPETIDA']));
    const comprobante = await enviarIntento('in_1', 'v1.tok', [], [], false, 'req_envio');
    expect(comprobante.nota).toBeUndefined();
    expect(comprobante).not.toHaveProperty('nota', 0);
  });

  it('aprovecha la nota si el resumen sí la trae', async () => {
    fetchSimulado.mockResolvedValue(
      envoltorio({ ...REPETICION, resumen: { estado: 'enviado', nota: 82 } }, ['SOLICITUD_REPETIDA']),
    );
    const comprobante = await enviarIntento('in_1', 'v1.tok', [], [], false, 'req_envio');
    expect(comprobante.nota).toBe(82);
  });

  it('respeta el estado «expirado» del resumen', async () => {
    fetchSimulado.mockResolvedValue(
      envoltorio({ ...REPETICION, resumen: { estado: 'expirado' } }, ['SOLICITUD_REPETIDA']),
    );
    const comprobante = await enviarIntento('in_1', 'v1.tok', [], [], true, 'req_envio');
    expect(comprobante.estado).toBe('expirado');
    expect(comprobante.envioAutomatico).toBe(true);
  });

  it('acepta el comprobante normal cuando no hay repetición', async () => {
    fetchSimulado.mockResolvedValue(
      envoltorio({
        intentoId: 'in_1',
        evaluacion: 'Prueba',
        estado: 'enviado',
        enviadoEn: '2026-08-05T10:00:00Z',
        envioAutomatico: false,
        repetido: false,
        respuestasRegistradas: 12,
        calificacionPendiente: true,
        segundosUsados: 640,
      }),
    );
    const comprobante = await enviarIntento('in_1', 'v1.tok', [], [], false, 'req_envio');
    expect(comprobante.respuestasRegistradas).toBe(12);
    expect(comprobante.calificacionPendiente).toBe(true);
    expect(comprobante.repetido).toBe(false);
  });
});

/* ========================================================================== */

describe('repetición idempotente en saveProgress', () => {
  /**
   * Un autoguardado repetido no es un problema: lo guardado sigue guardado. Mostrar un
   * error por algo que salió bien sería alarmar sin motivo en mitad de una prueba
   * cronometrada.
   */
  it('devuelve un resultado neutro en lugar de un error', async () => {
    fetchSimulado.mockResolvedValue(envoltorio(REPETICION, ['SOLICITUD_REPETIDA']));
    const resultado = await guardarProgreso(
      'in_1',
      'v1.tok',
      [{ preguntaId: 'pr_1', valor: 'x' }],
      [],
      'req_guardado',
    );
    expect(resultado.respuestasGuardadas).toBe(1);
    expect(resultado.expirado).toBe(false);
  });
});

/* ========================================================================== */

describe('abrirEvaluacion', () => {
  it('devuelve la indisponibilidad como dato, no como error', async () => {
    fetchSimulado.mockResolvedValue(
      envoltorio({
        codigo: 'EV-X',
        disponible: false,
        motivo: 'pausada',
        mensaje: 'La evaluación está pausada temporalmente.',
        titulo: 'Prueba',
        horaServidor: '2026-08-05T10:00:00Z',
      }),
    );
    const portada = await abrirEvaluacion('EV-X');
    expect(portada.disponible).toBe(false);
    expect(portada.motivo).toBe('pausada');
    // Es un dato, no una excepción: la pantalla puede ofrecer «volver a comprobar».
    expect(portada.mensaje).toContain('pausada');
  });

  /**
   * `openAssessment` no trae preguntas. Es lo que hace que abrir el enlace no permita
   * leer la prueba sin empezarla, y por eso el backend puede cachear esta respuesta.
   */
  it('la portada no contiene preguntas', async () => {
    fetchSimulado.mockResolvedValue(
      envoltorio({
        codigo: 'EV-X',
        disponible: true,
        motivo: '',
        mensaje: '',
        titulo: 'Prueba',
        horaServidor: '',
        totalPreguntas: 12,
      }),
    );
    const portada = await abrirEvaluacion('EV-X');
    expect(portada.totalPreguntas).toBe(12);
    expect(portada).not.toHaveProperty('secciones');
    expect(JSON.stringify(portada)).not.toContain('preguntas"');
  });
});
