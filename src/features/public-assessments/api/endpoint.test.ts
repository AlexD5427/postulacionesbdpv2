import { describe, expect, it } from 'vitest';
import { clasificarEndpoint } from './endpoint';

/**
 * Siete formas de configurar mal la dirección del Web App, y una bien.
 *
 * Cada rechazo nombra la variable en el diagnóstico. Es lo único que separa «revisa
 * `NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL`, apunta a /dev» de un error de red
 * genérico que manda a buscar el problema en el despliegue del ATS, en los permisos
 * del libro y en la conexión, en ese orden y durante horas.
 */
describe('clasificarEndpoint', () => {
  const VARIABLE = 'NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL';

  it('acepta una URL /exec correcta', () => {
    const resultado = clasificarEndpoint('https://script.google.com/macros/s/ABC123/exec');
    expect(resultado.estado).toBe('listo');
    expect(resultado.url).toBe('https://script.google.com/macros/s/ABC123/exec');
    expect(resultado.diagnostico).toBe('');
  });

  it('trata la ausencia como «ausente», que es un estado legítimo del primer arranque', () => {
    for (const vacio of [undefined, '', '   ']) {
      const resultado = clasificarEndpoint(vacio);
      expect(resultado.estado).toBe('ausente');
      expect(resultado.diagnostico).toContain(VARIABLE);
    }
  });

  it('rechaza lo que no es una URL absoluta', () => {
    const resultado = clasificarEndpoint('/api/evaluaciones');
    expect(resultado.estado).toBe('invalido');
    expect(resultado.diagnostico).toContain('absoluta');
  });

  it('rechaza http sin cifrar', () => {
    expect(clasificarEndpoint('http://script.google.com/macros/s/A/exec').estado).toBe('invalido');
  });

  /**
   * Apuntar el runner público a una superficie administrativa sería el peor error
   * posible: el navegador de un candidato hablando con acciones que pueden publicar o
   * borrar evaluaciones. Se rechaza por forma, antes de intentarlo.
   */
  it('rechaza una ruta que parece administrativa', () => {
    expect(clasificarEndpoint('https://portal.example/api/evaluaciones/exec').estado).toBe('invalido');
    expect(clasificarEndpoint('https://portal.example/admin/exec').estado).toBe('invalido');
  });

  it('rechaza una URL que no termina en /exec ni /dev', () => {
    const resultado = clasificarEndpoint('https://script.google.com/macros/s/ABC123');
    expect(resultado.estado).toBe('invalido');
    expect(resultado.diagnostico).toContain('/exec');
  });

  /**
   * `/dev` sirve el código guardado en el editor y sólo responde a cuentas que pueden
   * editar el script: un candidato recibiría una página HTML de inicio de sesión de
   * Google en lugar de JSON. Vale mientras se prueba y es un fallo invisible en
   * producción hasta que llega la primera persona real.
   */
  it('admite /dev fuera de producción y lo rechaza dentro', () => {
    const url = 'https://script.google.com/macros/s/ABC123/dev';
    expect(clasificarEndpoint(url, { produccion: false }).estado).toBe('listo');

    const enProduccion = clasificarEndpoint(url, { produccion: true });
    expect(enProduccion.estado).toBe('invalido');
    expect(enProduccion.diagnostico).toContain('/dev');
    expect(enProduccion.diagnostico).toContain(VARIABLE);
  });

  it('no devuelve nunca una URL utilizable cuando el estado no es «listo»', () => {
    const malos = ['', 'no-es-url', 'http://x/exec', 'https://x/admin/exec', 'https://x/editor'];
    for (const bruto of malos) {
      expect(clasificarEndpoint(bruto).url).toBe('');
    }
  });
});
