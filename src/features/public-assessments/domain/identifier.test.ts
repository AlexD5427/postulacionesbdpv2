import { describe, expect, it } from 'vitest';
import {
  analizarNumeroIdentificador,
  esNumeroIdentificadorValido,
  formatearMientrasEscribe,
  normalizarCodigoEvaluacion,
  normalizarNumeroIdentificador,
  pareceCodigoEvaluacion,
} from './identifier';

/**
 * El número identificador es la puerta del módulo: si acepta algo que no debe, el
 * intento se atribuye a otra persona, y si rechaza algo legítimo el candidato no
 * puede rendir su prueba. Las dos formas de fallar son graves, así que se prueban
 * las dos direcciones.
 */
describe('número identificador', () => {
  const hoy = new Date('2026-08-05T00:00:00Z');

  it('acepta el formato canónico y separa las tres partes', () => {
    const resultado = analizarNumeroIdentificador('1234567-12-2026', { hoy });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toEqual({
      completo: '1234567-12-2026',
      carnet: '1234567',
      proceso: '12',
      anio: 2026,
    });
  });

  it('acepta un carnet con la extensión de departamento', () => {
    const resultado = analizarNumeroIdentificador('8765432LP-4-2026', { hoy });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.carnet).toBe('8765432LP');
  });

  /**
   * Nadie escribe su documento igual. Rechazar por un espacio o por un guion
   * tipográfico que insertó el corrector del teclado sería hostil sin ganar nada: el
   * dato es exactamente el mismo.
   */
  it('normaliza espacios, minúsculas y guiones tipográficos', () => {
    expect(normalizarNumeroIdentificador(' 1234567 lp – 12 — 2026 ')).toBe('1234567LP-12-2026');
    const resultado = analizarNumeroIdentificador('1234567 lp – 12 — 2026', { hoy });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.completo).toBe('1234567LP-12-2026');
  });

  it('quita los ceros a la izquierda del proceso, para que 04 y 4 sean el mismo', () => {
    const a = analizarNumeroIdentificador('1234567-04-2026', { hoy });
    const b = analizarNumeroIdentificador('1234567-4-2026', { hoy });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.valor.proceso).toBe('4');
    expect(b.valor.proceso).toBe('4');
  });

  it('explica qué parte está mal, no solo que está mal', () => {
    expect(analizarNumeroIdentificador('', { hoy })).toMatchObject({ motivo: 'vacio' });
    expect(analizarNumeroIdentificador('1234567-12', { hoy })).toMatchObject({ motivo: 'formato' });
    expect(analizarNumeroIdentificador('12-12-2026', { hoy })).toMatchObject({ motivo: 'carnet' });
    expect(analizarNumeroIdentificador('1234567-AB-2026', { hoy })).toMatchObject({
      motivo: 'proceso',
    });
    expect(analizarNumeroIdentificador('1234567-12-26', { hoy })).toMatchObject({
      motivo: 'anio_no_numerico',
    });
  });

  it('rechaza un año imposible pero admite el siguiente, para invitaciones adelantadas', () => {
    expect(analizarNumeroIdentificador('1234567-12-1999', { hoy }).ok).toBe(false);
    expect(analizarNumeroIdentificador('1234567-12-2027', { hoy }).ok).toBe(true);
    expect(analizarNumeroIdentificador('1234567-12-2028', { hoy }).ok).toBe(false);
  });

  /**
   * Un formateador que pelea con quien escribe es peor que ninguno, y un carnet mal
   * reescrito es un intento atribuido a otra persona. Por eso sólo se limpia lo
   * imposible: no se insertan guiones ni se reordena nada.
   */
  it('mientras se escribe solo limpia, nunca reescribe', () => {
    expect(formatearMientrasEscribe('1234567')).toBe('1234567');
    expect(formatearMientrasEscribe('123.456/7')).toBe('1234567');
    expect(formatearMientrasEscribe('abc-1')).toBe('ABC-1');
    // No añade guiones por su cuenta.
    expect(formatearMientrasEscribe('1234567122026')).toBe('1234567122026');
  });

  it('esNumeroIdentificadorValido es coherente con el análisis', () => {
    expect(esNumeroIdentificadorValido('1234567-12-2026')).toBe(true);
    expect(esNumeroIdentificadorValido('no')).toBe(false);
  });
});

describe('código de la evaluación', () => {
  it('normaliza a mayúsculas y descarta lo que no puede formar parte del código', () => {
    expect(normalizarCodigoEvaluacion(' ev-ries-4f2a ')).toBe('EV-RIES-4F2A');
    expect(normalizarCodigoEvaluacion('EV_RIES 4F2A')).toBe('EVRIES4F2A');
  });

  /**
   * La comprobación es laxa a propósito. Quien decide si un código existe es el
   * servidor; una expresión regular estricta aquí rechazaría en el navegador un
   * código legítimo el día que el ATS cambie el prefijo, y el candidato vería «código
   * inválido» para un código perfectamente válido.
   */
  it('acepta cualquier código plausible y rechaza lo que no puede serlo', () => {
    expect(pareceCodigoEvaluacion('EV-RIES-4F2A')).toBe(true);
    expect(pareceCodigoEvaluacion('EVL-2026-001')).toBe(true);
    expect(pareceCodigoEvaluacion('XX')).toBe(false);
    expect(pareceCodigoEvaluacion('')).toBe(false);
  });
});
