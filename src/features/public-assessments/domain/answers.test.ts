import { describe, expect, it } from 'vitest';
import type { PreguntaPublica, SeccionPublica } from './contract';
import {
  aRespuestasEnviadas,
  enunciadoLoDibujaElControl,
  estaRespondida,
  obligatoriasPendientes,
  opcionalesOmitidas,
  preguntasContestables,
  preguntasDesconocidas,
  problemaDeRespuesta,
  sembrarRespuestas,
} from './answers';

function texto(cadena: string) {
  return { v: 1, b: [{ t: 'p' as const, s: [{ x: cadena }] }] };
}

function pregunta(parcial: Partial<PreguntaPublica> & { id: string; tipo: string }): PreguntaPublica {
  return {
    enunciado: texto('Enunciado'),
    ayuda: { v: 1, b: [] },
    obligatoria: false,
    configuracion: {},
    opciones: [],
    ...parcial,
  };
}

function seccion(preguntas: PreguntaPublica[]): SeccionPublica[] {
  return [
    {
      id: 'sec_1',
      titulo: 'Sección',
      descripcion: { v: 1, b: [] },
      limiteSegundos: null,
      preguntas,
    },
  ];
}

/* ========================================================================== */

describe('estaRespondida', () => {
  /**
   * El error clásico es `if (!valor)`: convierte el cero y el `false` en «sin
   * responder». Un 0 en una escala o en un importe es información, y descartarlo
   * significa que el servidor cuenta como no contestada una pregunta que sí lo fue.
   */
  it('acepta el cero y el false como respuestas válidas', () => {
    expect(estaRespondida({ valor: 0 })).toBe(true);
    expect(estaRespondida({ valor: false })).toBe(true);
  });

  it('rechaza lo que de verdad está vacío', () => {
    expect(estaRespondida(undefined)).toBe(false);
    expect(estaRespondida({})).toBe(false);
    expect(estaRespondida({ valor: '' })).toBe(false);
    expect(estaRespondida({ valor: null })).toBe(false);
    expect(estaRespondida({ valor: '   ' })).toBe(false);
    expect(estaRespondida({ opciones: [] })).toBe(false);
    expect(estaRespondida({ valor: [] })).toBe(false);
    expect(estaRespondida({ valor: {} })).toBe(false);
  });

  it('una cuadrícula con todas las filas en blanco no está respondida', () => {
    expect(estaRespondida({ valor: { fila_1: '', fila_2: [] } })).toBe(false);
    expect(estaRespondida({ valor: { fila_1: '', fila_2: 'Alto' } })).toBe(true);
  });

  it('un NaN no cuenta como número respondido', () => {
    expect(estaRespondida({ valor: Number.NaN })).toBe(false);
  });
});

/* ========================================================================== */

describe('forma del valor por tipo', () => {
  const secciones = seccion([
    pregunta({ id: 'pr_unica', tipo: 'opcion_unica', opciones: [{ id: 'op_a', valor: 'op_a', texto: texto('A') }] }),
    pregunta({ id: 'pr_multi', tipo: 'opcion_multiple', opciones: [{ id: 'op_b', valor: 'op_b', texto: texto('B') }] }),
    pregunta({ id: 'pr_texto', tipo: 'texto_corto' }),
    pregunta({ id: 'pr_num', tipo: 'numero' }),
    pregunta({ id: 'pr_escala', tipo: 'escala_lineal' }),
    pregunta({ id: 'pr_matriz', tipo: 'cuadricula_opcion', opciones: [{ id: 'f1', valor: 'f1', texto: texto('F1') }] }),
    pregunta({ id: 'pr_orden', tipo: 'ordenar', opciones: [{ id: 'o1', valor: 'o1', texto: texto('1') }] }),
    pregunta({ id: 'pr_huecos', tipo: 'rellenar_huecos' }),
  ]);

  it('las opciones viajan en `opciones` y el resto en `valor`', () => {
    const enviadas = aRespuestasEnviadas(secciones, {
      pr_unica: { opciones: ['op_a'] },
      pr_multi: { opciones: ['op_b'] },
      pr_texto: { valor: '  respuesta  ' },
      pr_num: { valor: '1250.5' },
      pr_escala: { valor: '4' },
      pr_matriz: { valor: { f1: 'Alto' } },
      pr_orden: { valor: ['o1'] },
      pr_huecos: { valor: { h1: ' corriente ' } },
    });
    const porId = new Map(enviadas.map((entrada) => [entrada.preguntaId, entrada]));

    expect(porId.get('pr_unica')).toEqual({ preguntaId: 'pr_unica', opciones: ['op_a'] });
    expect(porId.get('pr_multi')).toEqual({ preguntaId: 'pr_multi', opciones: ['op_b'] });
    // El texto viaja recortado: un espacio final no debe cambiar una comparación exacta.
    expect(porId.get('pr_texto')).toEqual({ preguntaId: 'pr_texto', valor: 'respuesta' });
    // Números como NÚMEROS: el input los entrega como cadena y el calificador del
    // servidor compara valores numéricos.
    expect(porId.get('pr_num')?.valor).toBe(1250.5);
    expect(porId.get('pr_escala')?.valor).toBe(4);
    expect(porId.get('pr_matriz')?.valor).toEqual({ f1: 'Alto' });
    expect(porId.get('pr_orden')?.valor).toEqual(['o1']);
    expect(porId.get('pr_huecos')?.valor).toEqual({ h1: 'corriente' });
  });

  it('las celdas vacías de un mapa no llegan al servidor', () => {
    const [entrada] = aRespuestasEnviadas(
      seccion([pregunta({ id: 'pr_matriz', tipo: 'cuadricula_opcion' })]),
      { pr_matriz: { valor: { f1: 'Alto', f2: '', f3: [] } } },
    );
    expect(entrada?.valor).toEqual({ f1: 'Alto' });
  });

  /**
   * La garantía más importante del módulo, en una prueba: el cliente no puede
   * enviar una nota ni una respuesta correcta. `RespuestaEnviada` no tiene esos
   * campos, así que ni con un valor manipulado en el estado se cuelan.
   */
  it('nunca envía campos de calificación, ni siquiera si están en el estado local', () => {
    const enviadas = aRespuestasEnviadas(secciones, {
      pr_texto: {
        valor: 'x',
        // @ts-expect-error se fuerza a propósito para comprobar que no sobrevive
        correcta: true,
        puntosObtenidos: 999,
        nota: 100,
      },
    });
    const serializado = JSON.stringify(enviadas);
    for (const prohibida of ['correcta', 'puntosObtenidos', 'nota', 'aprobado']) {
      expect(serializado).not.toContain(prohibida);
    }
  });

  it('las preguntas sin responder también viajan, para contarlas como en blanco', () => {
    const enviadas = aRespuestasEnviadas(secciones, {});
    expect(enviadas).toHaveLength(8);
    expect(enviadas.every((entrada) => entrada.preguntaId !== '')).toBe(true);
  });

  it('no repite ningún `preguntaId`', () => {
    const enviadas = aRespuestasEnviadas(secciones, { pr_texto: { valor: 'x' } });
    const ids = enviadas.map((entrada) => entrada.preguntaId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('adjunta las métricas solo cuando tienen algo que decir', () => {
    const [conMetrica] = aRespuestasEnviadas(
      seccion([pregunta({ id: 'pr_texto', tipo: 'texto_corto' })]),
      { pr_texto: { valor: 'x' } },
      { pr_texto: { visitas: 2, cambios: 3, segundos: 41 } },
    );
    expect(conMetrica).toMatchObject({ visitas: 2, cambios: 3, segundos: 41 });

    const [sinMetrica] = aRespuestasEnviadas(
      seccion([pregunta({ id: 'pr_texto', tipo: 'texto_corto' })]),
      { pr_texto: { valor: 'x' } },
      { pr_texto: { visitas: 0, cambios: 0, segundos: 0 } },
    );
    expect(sinMetrica).not.toHaveProperty('visitas');
  });
});

/* ========================================================================== */

describe('preguntas contestables', () => {
  it('excluye los bloques de contenido', () => {
    const secciones = seccion([
      pregunta({ id: 'c1', tipo: 'contenido_titulo' }),
      pregunta({ id: 'c2', tipo: 'contenido_separador' }),
      pregunta({ id: 'pr', tipo: 'texto_corto' }),
    ]);
    expect(preguntasContestables(secciones).map(({ pregunta: p }) => p.id)).toEqual(['pr']);
  });

  /**
   * Un tipo que el ATS añada y este módulo no conozca no puede responderse
   * honestamente. Que no cuente para el progreso ni bloquee el envío es deliberado:
   * el candidato no puede arreglar un desajuste entre dos despliegues, y una barra
   * que nunca llega al 100 % con un botón que nunca se activa lo dejaría encerrado.
   */
  it('un tipo desconocido no cuenta y no bloquea', () => {
    const secciones = seccion([
      pregunta({ id: 'pr_raro', tipo: 'q_holograma_3d', obligatoria: true }),
      pregunta({ id: 'pr', tipo: 'texto_corto', obligatoria: true }),
    ]);
    expect(preguntasContestables(secciones).map(({ pregunta: p }) => p.id)).toEqual(['pr']);
    expect(preguntasDesconocidas(secciones).map(({ pregunta: p }) => p.id)).toEqual(['pr_raro']);
    expect(obligatoriasPendientes(secciones, { pr: { valor: 'x' } })).toHaveLength(0);
  });

  it('separa obligatorias pendientes de opcionales omitidas', () => {
    const secciones = seccion([
      pregunta({ id: 'ob', tipo: 'texto_corto', obligatoria: true }),
      pregunta({ id: 'op', tipo: 'texto_corto' }),
    ]);
    expect(obligatoriasPendientes(secciones, {}).map(({ pregunta: p }) => p.id)).toEqual(['ob']);
    expect(opcionalesOmitidas(secciones, {}).map(({ pregunta: p }) => p.id)).toEqual(['op']);
  });
});

/* ========================================================================== */

describe('problemaDeRespuesta', () => {
  it('exige las obligatorias y deja pasar las opcionales', () => {
    const obligatoria = pregunta({ id: 'a', tipo: 'texto_corto', obligatoria: true });
    expect(problemaDeRespuesta(obligatoria, undefined)).toMatch(/obligatoria/i);
    expect(problemaDeRespuesta(pregunta({ id: 'b', tipo: 'texto_corto' }), undefined)).toBeNull();
  });

  it('respeta el mínimo y el máximo de selecciones', () => {
    const p = pregunta({
      id: 'a',
      tipo: 'opcion_multiple',
      configuracion: { minimoSelecciones: 2, maximoSelecciones: 3 },
    });
    expect(problemaDeRespuesta(p, { opciones: ['x'] })).toMatch(/al menos 2/);
    expect(problemaDeRespuesta(p, { opciones: ['a', 'b', 'c', 'd'] })).toMatch(/máximo 3/);
    expect(problemaDeRespuesta(p, { opciones: ['a', 'b'] })).toBeNull();
  });

  it('valida longitud de texto, correo y rango numérico', () => {
    const largo = pregunta({
      id: 'a',
      tipo: 'texto_largo',
      configuracion: { minimoCaracteres: 10 },
    });
    expect(problemaDeRespuesta(largo, { valor: 'corto' })).toMatch(/al menos 10/);

    const correo = pregunta({ id: 'b', tipo: 'correo' });
    expect(problemaDeRespuesta(correo, { valor: 'no-es-correo' })).toMatch(/correo/i);
    expect(problemaDeRespuesta(correo, { valor: 'a@b.com' })).toBeNull();

    const numero = pregunta({ id: 'c', tipo: 'numero', configuracion: { minimo: 0, maximo: 10 } });
    expect(problemaDeRespuesta(numero, { valor: 20 })).toMatch(/máximo es 10/);
    expect(problemaDeRespuesta(numero, { valor: 5 })).toBeNull();
  });

  /**
   * El patrón lo escribe el autor en el editor del ATS. Uno inválido no puede tumbar
   * la pantalla de un candidato: si no compila, simplemente no se valida.
   */
  it('un patrón inválido no rompe nada', () => {
    const p = pregunta({ id: 'a', tipo: 'texto_corto', configuracion: { patron: '([' } });
    expect(problemaDeRespuesta(p, { valor: 'x' })).toBeNull();
  });

  it('exige un enlace real en las preguntas de archivo', () => {
    const p = pregunta({ id: 'a', tipo: 'archivo_enlace' });
    expect(problemaDeRespuesta(p, { valor: 'mi-archivo.pdf' })).toMatch(/https/);
    expect(problemaDeRespuesta(p, { valor: 'https://drive.example/x' })).toBeNull();
  });
});

/* ========================================================================== */

describe('sembrarRespuestas', () => {
  it('recupera lo que el servidor tenía guardado', () => {
    const secciones = seccion([
      pregunta({ id: 'pr_a', tipo: 'texto_corto' }),
      pregunta({ id: 'pr_b', tipo: 'opcion_unica', opciones: [{ id: 'op', valor: 'op', texto: texto('O') }] }),
    ]);
    const mapa = sembrarRespuestas(secciones, [
      { preguntaId: 'pr_a', opciones: [], valor: 'hola' },
      { preguntaId: 'pr_b', opciones: ['op'], valor: null },
    ]);
    expect(mapa).toEqual({ pr_a: { valor: 'hola' }, pr_b: { opciones: ['op'] } });
  });

  /**
   * Si el ATS publicó una versión nueva entre dos visitas, arrastrar respuestas de la
   * anterior las asignaría a otras preguntas. Descartarlas es lo correcto: el
   * candidato responde de nuevo, en lugar de entregar respuestas cruzadas.
   */
  it('descarta respuestas de preguntas que ya no están en esta versión', () => {
    const secciones = seccion([pregunta({ id: 'pr_a', tipo: 'texto_corto' })]);
    const mapa = sembrarRespuestas(secciones, [
      { preguntaId: 'pr_a', opciones: [], valor: 'sí' },
      { preguntaId: 'pr_borrada', opciones: [], valor: 'no debería estar' },
    ]);
    expect(Object.keys(mapa)).toEqual(['pr_a']);
  });
});

/* ========================================================================== */

describe('enunciadoLoDibujaElControl', () => {
  /**
   * En «rellenar huecos» el control dibuja la frase con los campos dentro. Si además se
   * pintara el enunciado, la frase aparecería dos veces seguidas — se vio en la captura
   * de la revisión visual y es exactamente el tipo de detalle que sólo se nota mirando.
   */
  it('es cierto cuando los huecos están en el propio enunciado', () => {
    const p = pregunta({
      id: 'pr',
      tipo: 'rellenar_huecos',
      enunciado: texto('La razón ______ mide la liquidez.'),
    });
    expect(enunciadoLoDibujaElControl(p)).toBe(true);
  });

  it('es falso cuando el autor definió una plantilla aparte', () => {
    const p = pregunta({
      id: 'pr',
      tipo: 'rellenar_huecos',
      enunciado: texto('Completa la definición.'),
      configuracion: { huecosTexto: 'La razón ______ mide la liquidez.' },
    });
    expect(enunciadoLoDibujaElControl(p)).toBe(false);
  });

  it('es falso para cualquier otro tipo, aunque el enunciado tenga guiones', () => {
    const p = pregunta({
      id: 'pr',
      tipo: 'texto_corto',
      enunciado: texto('Completa: la razón ______ mide la liquidez.'),
    });
    expect(enunciadoLoDibujaElControl(p)).toBe(false);
  });
});
