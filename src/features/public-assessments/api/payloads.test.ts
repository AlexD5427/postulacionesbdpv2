import { describe, expect, it, vi } from 'vitest';
import { CLAVES_PROHIBIDAS, ESQUEMAS, leerDatos, quitarClavesProhibidas } from './payloads';

/**
 * La segunda línea de defensa contra una fuga de la clave de respuestas.
 *
 * La primera es el servidor: `13_Public.gs` construye la proyección pública campo por
 * campo con lista blanca, así que en un backend correcto esto nunca borra nada. Existe
 * porque el portal **no controla qué versión del script está desplegada**: un
 * despliegue viejo, un archivo `.gs` copiado a medias o un `evPublicQuestion_`
 * modificado a mano filtrarían las respuestas correctas al navegador de quien está
 * rindiendo la prueba.
 */
describe('quitarClavesProhibidas', () => {
  it('borra la clave de respuestas a cualquier profundidad', () => {
    const bruto = {
      codigo: 'EV-X',
      puntajeAprobacion: 70,
      secciones: [
        {
          id: 'sec_1',
          preguntas: [
            {
              id: 'pr_1',
              enunciado: { v: 1, b: [] },
              respuestaEsperada: { valor: '42' },
              modoPuntaje: 'exacto',
              puntos: 10,
              opciones: [
                { id: 'op_a', texto: { v: 1, b: [] }, correcta: true, claveEmparejamiento: 'Activo' },
                { id: 'op_b', texto: { v: 1, b: [] }, correcta: false },
              ],
            },
          ],
        },
      ],
    };

    const { valor, encontradas } = quitarClavesProhibidas(bruto);
    const serializado = JSON.stringify(valor);

    for (const prohibida of [
      'correcta',
      'claveEmparejamiento',
      'respuestaEsperada',
      'modoPuntaje',
      'puntajeAprobacion',
    ]) {
      expect(serializado, `no debe contener ${prohibida}`).not.toContain(prohibida);
    }
    expect(encontradas.sort()).toEqual(
      ['claveEmparejamiento', 'correcta', 'modoPuntaje', 'puntajeAprobacion', 'respuestaEsperada'].sort(),
    );
  });

  /**
   * `puntos` es el PESO de la pregunta, no la clave. El backend lo publica a propósito
   * porque el candidato tiene derecho a saber cuánto vale cada pregunta; borrarlo
   * «por si acaso» empeoraría el producto sin proteger nada.
   */
  it('conserva `puntos`, que no es una clave de respuesta', () => {
    const { valor } = quitarClavesProhibidas({ puntos: 10, correcta: true });
    expect(valor).toEqual({ puntos: 10 });
  });

  it('conserva todo lo que la pregunta necesita para dibujarse', () => {
    const pregunta = {
      id: 'pr_1',
      tipo: 'opcion_unica',
      enunciado: { v: 1, b: [{ t: 'p', s: [{ x: 'x' }] }] },
      ayuda: { v: 1, b: [] },
      obligatoria: true,
      configuracion: { minimo: 1, columnasMatriz: ['A'] },
      opciones: [{ id: 'op', valor: 'op', texto: { v: 1, b: [] }, imagenUrl: 'https://x/y.png' }],
      puntos: 5,
    };
    const { valor, encontradas } = quitarClavesProhibidas(pregunta);
    expect(encontradas).toEqual([]);
    expect(valor).toEqual(pregunta);
  });

  it('no se cuelga con una estructura muy anidada', () => {
    let nodo: Record<string, unknown> = { correcta: true };
    for (let i = 0; i < 40; i += 1) nodo = { hijo: nodo };
    expect(() => quitarClavesProhibidas(nodo)).not.toThrow();
  });

  it('la lista de claves prohibidas no está vacía y no incluye nada necesario', () => {
    expect(CLAVES_PROHIBIDAS.length).toBeGreaterThan(15);
    for (const necesaria of ['id', 'tipo', 'enunciado', 'opciones', 'configuracion', 'puntos']) {
      expect(CLAVES_PROHIBIDAS as readonly string[]).not.toContain(necesaria);
    }
  });
});

/* ========================================================================== */

describe('leerDatos', () => {
  const portadaValida = {
    codigo: 'EV-X',
    disponible: true,
    motivo: '',
    mensaje: '',
    titulo: 'Prueba',
    horaServidor: '2026-08-05T10:00:00Z',
  };

  it('valida y devuelve el dato tipado, con los valores por omisión aplicados', () => {
    const resultado = leerDatos('openAssessment', ESQUEMAS.portada, portadaValida);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.codigo).toBe('EV-X');
  });

  /**
   * Un `undefined` propagándose por la aplicación era el fallo más frecuente y menos
   * informativo de la iteración anterior. Aquí una respuesta con otra forma se
   * convierte en un diagnóstico que nombra el campo.
   */
  it('convierte una forma inesperada en un diagnóstico con la ruta del campo', () => {
    const resultado = leerDatos('startAttempt', ESQUEMAS.inicio, { intentoId: 'in_1' });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.diagnostico).toContain('startAttempt');
    expect(resultado.diagnostico).toMatch(/token|prueba/);
  });

  it('registra la fuga como defecto del backend con los NOMBRES, nunca los valores', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    leerDatos('startAttempt', ESQUEMAS.portada, {
      ...portadaValida,
      // Una fuga: el valor jamás debe aparecer en el registro.
      respuestaEsperada: { valor: 'LA_RESPUESTA_SECRETA' },
    });
    const registrado = espia.mock.calls.map((llamada) => String(llamada[0])).join(' ');
    expect(registrado).toContain('respuestaEsperada');
    expect(registrado).not.toContain('LA_RESPUESTA_SECRETA');
    espia.mockRestore();
  });

  /**
   * El texto enriquecido se sanea en la frontera de red, no al pintar. Así ningún
   * componente puede olvidarse de llamar al saneador: un `javascript:` desaparece
   * antes de que exista un solo nodo de React.
   */
  it('sanea el texto enriquecido en la frontera, incluidos los enlaces peligrosos', () => {
    const resultado = leerDatos('openAssessment', ESQUEMAS.portada, {
      ...portadaValida,
      instrucciones: { v: 1, b: [{ t: 'p', s: [{ x: 'pulsa', l: 'javascript:alert(1)' }] }] },
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(JSON.stringify(resultado.valor.instrucciones)).not.toContain('javascript');
    expect(JSON.stringify(resultado.valor.instrucciones)).toContain('pulsa');
  });

  it('un tema con un acento inventado cae al acento por omisión en lugar de invalidar la prueba', () => {
    const resultado = leerDatos('openAssessment', ESQUEMAS.portada, {
      ...portadaValida,
      tema: { acento: 'fucsia_neon', densidad: 'gigante' },
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.tema?.acento).toBe('cian');
    expect(resultado.valor.tema?.densidad).toBe('comoda');
  });

  it('el comprobante admite venir sin nota, porque el backend puede no mandarla', () => {
    const resultado = leerDatos('submitAttempt', ESQUEMAS.comprobante, {
      intentoId: 'in_1',
      estado: 'enviado',
      enviadoEn: '2026-08-05T10:00:00Z',
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.nota).toBeUndefined();
    // Y no se rellena con un cero, que es lo que haría creer al candidato que sacó 0.
    expect(resultado.valor).not.toHaveProperty('nota', 0);
  });
});
