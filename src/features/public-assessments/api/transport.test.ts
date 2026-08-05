import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El transporte es donde viven las tres reglas de Apps Script. Si una se rompe, el
 * módulo entero deja de funcionar en producción y el síntoma no señala la causa: un
 * `404` cuando falta `redirect: 'follow'`, un error de CORS cuando el
 * `Content-Type` cambia y un intento duplicado cuando el `solicitudId` se renueva.
 *
 * Estas pruebas fijan las tres, además de la política de reintentos.
 */

vi.mock('./endpoint', () => ({
  endpointEvaluaciones: () => ({
    estado: 'listo',
    url: 'https://script.google.com/macros/s/PRUEBA/exec',
    diagnostico: '',
  }),
  esModoDemostracion: () => false,
}));

import { ErrorEvaluaciones } from './errors';
import { escribir, leer } from './transport';

function respuestaOk(datos: unknown, extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          ok: true,
          accion: 'openAssessment',
          solicitudId: '',
          datos,
          error: null,
          avisos: [],
          meta: { traza: 'tz_1', horaServidor: '2026-08-05T10:00:00Z', backend: '2.0.0', esquema: 2 },
          ...extra,
        }),
      ),
  };
}

function respuestaError(codigo: string, mensaje = 'no', detalle: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          ok: false,
          accion: 'openAssessment',
          solicitudId: '',
          datos: null,
          error: { codigo, mensaje, pista: 'una pista', detalle, traza: 'tz_9' },
          avisos: [],
          meta: { traza: 'tz_9' },
        }),
      ),
  };
}

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/* ========================================================================== */

describe('las tres reglas de Apps Script', () => {
  it('sigue la redirección, usa text/plain y no manda cookies', async () => {
    fetchSimulado.mockResolvedValue(respuestaOk({ disponible: true }));
    await leer('openAssessment', { codigo: 'EV-X' });

    const [url, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://script.google.com/macros/s/PRUEBA/exec');
    // Regla 1: Google contesta 302 y el cuerpo vive detrás de la redirección.
    expect(opciones.redirect).toBe('follow');
    // Regla 2: `application/json` dispararía un preflight que el despliegue no puede
    // contestar; con `text/plain` la petición es «simple».
    expect((opciones.headers as Record<string, string>)['Content-Type']).toBe(
      'text/plain;charset=utf-8',
    );
    expect(opciones.method).toBe('POST');
    // Endpoint de terceros: ninguna cookie del portal debe viajar.
    expect(opciones.credentials).toBe('omit');
    expect(opciones.cache).toBe('no-store');
  });

  it('el cuerpo lleva la acción, el payload y el cliente, y nunca una llave de administración', async () => {
    fetchSimulado.mockResolvedValue(respuestaOk({}));
    await leer('openAssessment', { codigo: 'EV-X' });

    const [, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    const cuerpo = JSON.parse(String(opciones.body)) as Record<string, unknown>;
    expect(cuerpo.accion).toBe('openAssessment');
    expect(cuerpo.payload).toEqual({ codigo: 'EV-X' });
    expect(typeof cuerpo.cliente).toBe('string');
    // Nada de administración desde el navegador de un candidato.
    expect(cuerpo).not.toHaveProperty('llaveAdmin');
    expect(cuerpo).not.toHaveProperty('adminKey');
    expect(cuerpo).not.toHaveProperty('actor');
  });

  it('las lecturas van con solicitudId vacío, porque el backend solo lo consume en escrituras', async () => {
    fetchSimulado.mockResolvedValue(respuestaOk({}));
    await leer('openAssessment', {});
    const cuerpo = JSON.parse(
      String((fetchSimulado.mock.calls[0] as [string, RequestInit])[1].body),
    ) as Record<string, unknown>;
    expect(cuerpo.solicitudId).toBe('');
  });

  it('una escritura sin solicitudId se rechaza antes de salir del navegador', async () => {
    await expect(escribir('submitAttempt', '', {})).rejects.toMatchObject({
      codigo: 'BAD_REQUEST',
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('la escritura manda el solicitudId literalmente, sin tocarlo', async () => {
    fetchSimulado.mockResolvedValue(respuestaOk({}));
    await escribir('submitAttempt', 'req_fijo_123', { intentoId: 'in_1' });
    const cuerpo = JSON.parse(
      String((fetchSimulado.mock.calls[0] as [string, RequestInit])[1].body),
    ) as Record<string, unknown>;
    expect(cuerpo.solicitudId).toBe('req_fijo_123');
  });
});

/* ========================================================================== */

describe('política de reintentos', () => {
  it('reintenta una lectura ante un fallo de red y devuelve el resultado del último intento', async () => {
    fetchSimulado
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(respuestaOk({ disponible: true }));

    const resultado = await leer<{ disponible: boolean }>('openAssessment', {});
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
    expect(resultado.datos).toEqual({ disponible: true });
  });

  it('agota los reintentos y falla con TRANSPORTE', async () => {
    fetchSimulado.mockRejectedValue(new Error('network down'));
    await expect(leer('openAssessment', {})).rejects.toMatchObject({ codigo: 'TRANSPORTE' });
    // Un intento inicial más dos reintentos.
    expect(fetchSimulado).toHaveBeenCalledTimes(3);
  });

  /**
   * Aunque el servidor sea idempotente, un reintento automático de una escritura
   * esconde el problema de red que conviene ver y convierte un envío en una operación
   * cuyo número de ejecuciones nadie puede contar. Quien reintenta es la persona.
   */
  it('NO reintenta una escritura, nunca', async () => {
    fetchSimulado.mockRejectedValue(new Error('network down'));
    await expect(escribir('submitAttempt', 'req_1', {})).rejects.toMatchObject({
      codigo: 'TRANSPORTE',
    });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('un error de negocio es una respuesta válida y no se reintenta', async () => {
    fetchSimulado.mockResolvedValue(respuestaError('NOT_FOUND', 'No existe.'));
    await expect(leer('openAssessment', {})).rejects.toMatchObject({ codigo: 'NOT_FOUND' });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('mandar una escritura por el camino de lectura es un error de programación, no un reintento', async () => {
    await expect(leer('submitAttempt', {})).rejects.toMatchObject({ codigo: 'BAD_REQUEST' });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

/* ========================================================================== */

describe('traducción de fallos', () => {
  it('distingue los códigos HTTP que exigen acciones distintas', async () => {
    const casos: [number, string][] = [
      [401, 'CONFIGURACION'],
      [403, 'CONFIGURACION'],
      [404, 'CONFIGURACION'],
      [500, 'INTERNAL_ERROR'],
    ];
    for (const [estado, codigo] of casos) {
      fetchSimulado.mockReset();
      fetchSimulado.mockResolvedValue({ ok: false, status: estado, text: () => Promise.resolve('') });
      await expect(escribir('submitAttempt', 'req_1', {})).rejects.toMatchObject({ codigo });
    }
  });

  /**
   * El síntoma más engañoso de todos: la URL apunta a una pantalla de inicio de sesión
   * de Google y la respuesta es HTML con código 200. Sin este caso, el error sería un
   * fallo de análisis de JSON en algún punto lejano.
   */
  it('reconoce una página HTML como problema de configuración, no como error de datos', async () => {
    fetchSimulado.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<!DOCTYPE html><html><body>Sign in</body></html>'),
    });
    const error = await escribir('submitAttempt', 'req_1', {}).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorEvaluaciones);
    expect(error.codigo).toBe('RESPUESTA_INVALIDA');
    expect(error.diagnostico).toMatch(/JSON/);
  });

  it('reconoce un JSON con otra forma como respuesta que no es de este backend', async () => {
    fetchSimulado.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ success: true, data: {} })),
    });
    await expect(escribir('submitAttempt', 'req_1', {})).rejects.toMatchObject({
      codigo: 'RESPUESTA_INVALIDA',
    });
  });

  /**
   * La pista y la traza son lo que convierte un error en una instrucción y lo que
   * permite encontrar la entrada exacta del diario en la hoja `Registro`. Perderlas al
   * cruzar esta frontera es lo que convierte un backend explícito en una aplicación
   * que dice «ocurrió un error».
   */
  it('conserva la pista, el detalle y la traza del backend', async () => {
    fetchSimulado.mockResolvedValue(
      respuestaError('FORBIDDEN', 'Ya realizaste esta evaluación.', { intentosMaximos: 1 }),
    );
    const error = await leer('openAssessment', {}).catch((e) => e);
    expect(error.pista).toBe('una pista');
    expect(error.detalle).toEqual({ intentosMaximos: 1 });
    expect(error.traza).toBe('tz_9');
    // Los mensajes que el backend escribió PARA el candidato sí se muestran.
    expect(error.mensajeCandidato).toBe('Ya realizaste esta evaluación.');
  });

  it('un código que no conocemos se trata como error interno en lugar de propagarse', async () => {
    fetchSimulado.mockResolvedValue(respuestaError('CODIGO_DEL_FUTURO'));
    await expect(leer('openAssessment', {})).rejects.toMatchObject({ codigo: 'INTERNAL_ERROR' });
  });

  /**
   * Los mensajes de infraestructura hablan de hojas, columnas y propiedades del
   * script. Un candidato no puede hacer nada con eso y no tiene por qué verlo.
   */
  it('no muestra al candidato el mensaje de un error de infraestructura', async () => {
    fetchSimulado.mockResolvedValue(
      respuestaError('SCHEMA_ERROR', 'Falta la columna proceso_id en la hoja Intentos.'),
    );
    const error = await leer('openAssessment', {}).catch((e) => e);
    expect(error.mensajeCandidato).not.toContain('columna');
    expect(error.mensajeCandidato).not.toContain('Intentos');
    // Pero sí se conserva para el registro de quien opera.
    expect(error.diagnostico).toContain('proceso_id');
  });
});

/* ========================================================================== */

describe('repeticiones idempotentes', () => {
  it('marca la respuesta cuando el servidor avisa SOLICITUD_REPETIDA', async () => {
    fetchSimulado.mockResolvedValue(
      respuestaOk({ repetida: true, referencia: 'in_1', procesadoEn: '2026-08-05T10:00:00Z', resumen: {} }, {
        avisos: ['SOLICITUD_REPETIDA'],
      }),
    );
    const resultado = await escribir('submitAttempt', 'req_1', {});
    expect(resultado.repetida).toBe(true);
    expect(resultado.avisos).toContain('SOLICITUD_REPETIDA');
  });
});
