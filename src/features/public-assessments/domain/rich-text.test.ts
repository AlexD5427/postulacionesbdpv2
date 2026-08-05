import { describe, expect, it } from 'vitest';
import {
  agruparBloques,
  docRicoVacio,
  docRicoVacioP,
  enlaceSeguro,
  sanearDocRico,
  textoPlanoBreve,
  textoPlanoDe,
} from './rich-text';

/**
 * El modelo de texto enriquecido es la razón por la que este módulo no necesita
 * sanear HTML en ningún punto. Estas pruebas defienden esa propiedad: si un día
 * alguien deja pasar un `href` con `javascript:`, la suite falla antes de que llegue
 * a un navegador.
 */
describe('enlaceSeguro', () => {
  it('admite http, https y mailto', () => {
    expect(enlaceSeguro('https://banco.example/norma')).toBe('https://banco.example/norma');
    expect(enlaceSeguro('http://banco.example')).toBe('http://banco.example');
    expect(enlaceSeguro('mailto:rrhh@banco.example')).toBe('mailto:rrhh@banco.example');
  });

  it('descarta cualquier otro esquema, en cualquier disfraz', () => {
    const peligrosos = [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'vbscript:msgbox',
      '/ruta/relativa',
      '//evil.example',
      'file:///etc/passwd',
    ];
    for (const url of peligrosos) expect(enlaceSeguro(url)).toBe('');
  });
});

describe('sanearDocRico', () => {
  it('acepta el modelo completo y conserva las marcas válidas', () => {
    const doc = sanearDocRico({
      v: 1,
      b: [{ t: 'p', s: [{ x: 'mora', m: ['b', 'i'] }] }],
    });
    expect(doc.b[0]?.s[0]).toEqual({ x: 'mora', m: ['b', 'i'] });
  });

  it('descarta marcas inventadas y no las deja pasar al renderizador', () => {
    const doc = sanearDocRico({ v: 1, b: [{ t: 'p', s: [{ x: 'texto', m: ['b', 'blink', 'xss'] }] }] });
    expect(doc.b[0]?.s[0]?.m).toEqual(['b']);
  });

  it('degrada un tipo de bloque desconocido a párrafo en lugar de perder el texto', () => {
    const doc = sanearDocRico({ v: 1, b: [{ t: 'marquee', s: [{ x: 'importante' }] }] });
    expect(doc.b[0]?.t).toBe('p');
    expect(doc.b[0]?.s[0]?.x).toBe('importante');
  });

  it('borra el enlace peligroso y conserva el texto', () => {
    const doc = sanearDocRico({
      v: 1,
      b: [{ t: 'p', s: [{ x: 'pulsa aquí', l: 'javascript:alert(1)' }] }],
    });
    expect(doc.b[0]?.s[0]?.x).toBe('pulsa aquí');
    expect(doc.b[0]?.s[0]?.l).toBeUndefined();
  });

  /**
   * Tolerancia en la entrada: un importador simple, un cliente antiguo o el modo de
   * demostración pueden mandar una cadena, un arreglo de bloques o `null`. En los
   * tres casos hay que devolver algo pintable, no reventar la pantalla.
   */
  it('acepta cadenas, arreglos, JSON serializado y nada', () => {
    expect(sanearDocRico('Primera\nSegunda').b).toHaveLength(2);
    expect(sanearDocRico([{ t: 'p', s: [{ x: 'x' }] }]).b).toHaveLength(1);
    expect(sanearDocRico('{"v":1,"b":[{"t":"h2","s":[{"x":"T"}]}]}').b[0]?.t).toBe('h2');
    expect(sanearDocRico(null)).toEqual(docRicoVacio());
    expect(sanearDocRico(undefined)).toEqual(docRicoVacio());
    expect(sanearDocRico(42).b[0]?.s[0]?.x).toBe('42');
  });

  it('admite las claves largas del modelo (`blocks`, `spans`, `marks`, `link`)', () => {
    const doc = sanearDocRico({
      blocks: [{ type: 'quote', spans: [{ text: 'cita', marks: ['i'], link: 'https://x.example' }] }],
    });
    expect(doc.b[0]?.t).toBe('quote');
    expect(doc.b[0]?.s[0]).toEqual({ x: 'cita', m: ['i'], l: 'https://x.example' });
  });

  it('acota el tamaño total para que un campo patológico no cuelgue la pestaña', () => {
    const enorme = { v: 1, b: [{ t: 'p', s: [{ x: 'a'.repeat(50_000) }] }] };
    expect(textoPlanoDe(sanearDocRico(enorme)).length).toBeLessThanOrEqual(20_000);
  });

  it('no conserva bloques vacíos al final', () => {
    const doc = sanearDocRico({ v: 1, b: [{ t: 'p', s: [{ x: 'x' }] }, { t: 'p', s: [] }, { t: 'p', s: [] }] });
    expect(doc.b).toHaveLength(1);
  });
});

describe('proyección a texto plano', () => {
  it('marca las listas para que el resumen sea legible', () => {
    const plano = textoPlanoDe({
      v: 1,
      b: [
        { t: 'p', s: [{ x: 'Requisitos:' }] },
        { t: 'ul', s: [{ x: 'uno' }] },
        { t: 'ol', s: [{ x: 'primero' }] },
        { t: 'ol', s: [{ x: 'segundo' }] },
      ],
    });
    expect(plano).toBe('Requisitos:\n• uno\n1. primero\n2. segundo');
  });

  it('recorta con puntos suspensivos para las etiquetas', () => {
    const breve = textoPlanoBreve({ v: 1, b: [{ t: 'p', s: [{ x: 'x'.repeat(200) }] }] }, 20);
    expect(breve).toHaveLength(20);
    expect(breve.endsWith('…')).toBe(true);
  });

  it('detecta un documento sin nada visible', () => {
    expect(docRicoVacioP(null)).toBe(true);
    expect(docRicoVacioP({ v: 1, b: [{ t: 'p', s: [{ x: '   ' }] }] })).toBe(true);
    expect(docRicoVacioP({ v: 1, b: [{ t: 'p', s: [{ x: 'x' }] }] })).toBe(false);
  });
});

/**
 * Sin agrupar, cada elemento de lista sería su propia `<ul>`: la numeración de las
 * ordenadas se reinicia en cada punto y un lector de pantalla anuncia «lista de un
 * elemento» una vez por línea.
 */
describe('agruparBloques', () => {
  it('junta las listas consecutivas del mismo tipo y corta al cambiar', () => {
    const grupos = agruparBloques(
      sanearDocRico({
        v: 1,
        b: [
          { t: 'p', s: [{ x: 'intro' }] },
          { t: 'ul', s: [{ x: 'a' }] },
          { t: 'ul', s: [{ x: 'b' }] },
          { t: 'ol', s: [{ x: '1' }] },
          { t: 'p', s: [{ x: 'fin' }] },
        ],
      }).b,
    );
    expect(grupos.map((grupo) => grupo.tipo)).toEqual([
      'suelto',
      'lista-ul',
      'lista-ol',
      'suelto',
    ]);
    const listaUl = grupos[1];
    expect(listaUl?.tipo === 'lista-ul' && listaUl.bloques).toHaveLength(2);
  });
});
