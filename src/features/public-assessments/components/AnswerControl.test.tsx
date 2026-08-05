import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PreguntaPublica } from '../domain/contract';
import { AnswerControl } from './AnswerControl';

/**
 * Un control por forma de respuesta, y la forma del valor que produce.
 *
 * Estas pruebas son el puente entre la interfaz y el calificador del servidor: si un
 * control emite `opciones` donde el servidor espera `valor` (o al revés), la respuesta
 * se califica como incorrecta y **nada** en el sistema señala al cliente como culpable.
 * Por eso cada caso comprueba el valor emitido, no sólo que el control se pinte.
 */

function texto(cadena: string) {
  return { v: 1, b: [{ t: 'p' as const, s: [{ x: cadena }] }] };
}

function opcion(id: string, etiqueta: string) {
  return { id, valor: id, texto: texto(etiqueta) };
}

function pregunta(
  parcial: Partial<PreguntaPublica> & { id: string; tipo: string },
): PreguntaPublica {
  return {
    enunciado: texto('Enunciado'),
    ayuda: { v: 1, b: [] },
    obligatoria: false,
    configuracion: {},
    opciones: [],
    ...parcial,
  };
}

function montar(p: PreguntaPublica, valor?: { opciones?: string[]; valor?: unknown }) {
  const onChange = vi.fn();
  const utilidades = render(
    <AnswerControl
      pregunta={p}
      valor={valor}
      onChange={onChange}
      bloqueado={false}
      bloquearPegado={false}
      onPegar={vi.fn()}
      onCopiar={vi.fn()}
    />,
  );
  return { onChange, ...utilidades };
}

/** Último valor con el que se llamó a `onChange`. */
function ultimo(onChange: ReturnType<typeof vi.fn>): unknown {
  const llamadas = onChange.mock.calls;
  return llamadas[llamadas.length - 1]?.[0];
}

/**
 * Arnés con estado.
 *
 * `AnswerControl` es un componente controlado: sin alguien que devuelva el valor por
 * la propiedad, escribir «hola» produce cuatro llamadas de un carácter y el campo
 * nunca acumula nada. Eso es correcto en el componente y hace inútil la prueba, así
 * que aquí se cierra el ciclo igual que lo cierra el runner.
 */
function montarControlado(p: PreguntaPublica, inicial?: { opciones?: string[]; valor?: unknown }) {
  const onChange = vi.fn();
  function Arnes() {
    const [valor, setValor] = useState(inicial);
    return (
      <AnswerControl
        pregunta={p}
        valor={valor}
        onChange={(siguiente) => {
          onChange(siguiente);
          setValor(siguiente);
        }}
        bloqueado={false}
        bloquearPegado={false}
        onPegar={vi.fn()}
        onCopiar={vi.fn()}
      />
    );
  }
  const utilidades = render(<Arnes />);
  return { onChange, ...utilidades };
}

/* ========================================================================== */

describe('opciones', () => {
  const unica = pregunta({
    id: 'pr',
    tipo: 'opcion_unica',
    opciones: [opcion('op_a', 'Categoría A'), opcion('op_b', 'Categoría B')],
  });

  it('emite un arreglo de ids en `opciones`', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montar(unica);
    await usuario.click(screen.getByRole('radio', { name: /categoría b/i }));
    expect(ultimo(onChange)).toEqual({ opciones: ['op_b'] });
  });

  /**
   * Usar controles nativos ocultos no es un detalle de implementación: es lo que da la
   * semántica de grupo, la navegación con flechas y el anuncio del estado sin
   * reimplementar nada. Un `<div role="radio">` siempre queda a medias.
   */
  it('usa radios nativos, para que el teclado y el lector de pantalla funcionen solos', () => {
    montar(unica);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    // Mismo `name`: es lo que forma el grupo para el navegador.
    expect(radios[0]?.getAttribute('name')).toBe(radios[1]?.getAttribute('name'));
  });

  it('una opción única ya elegida se puede desmarcar', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montar(unica, { opciones: ['op_a'] });
    await usuario.click(screen.getByRole('radio', { name: /categoría a/i }));
    expect(ultimo(onChange)).toEqual({ opciones: [] });
  });

  it('la opción múltiple acumula y quita', async () => {
    const usuario = userEvent.setup();
    const multiple = pregunta({
      id: 'pr',
      tipo: 'opcion_multiple',
      opciones: [opcion('op_a', 'A'), opcion('op_b', 'B')],
    });
    const { onChange } = montar(multiple, { opciones: ['op_a'] });
    await usuario.click(screen.getByRole('checkbox', { name: 'B' }));
    expect(ultimo(onChange)).toEqual({ opciones: ['op_a', 'op_b'] });
  });

  /**
   * Con el tope alcanzado, aceptar el clic y descartarlo en silencio hace que el
   * control parezca roto. Desactivar las no elegidas explica por sí solo qué pasa.
   */
  it('desactiva las opciones no elegidas al alcanzar el máximo', () => {
    const multiple = pregunta({
      id: 'pr',
      tipo: 'opcion_multiple',
      configuracion: { maximoSelecciones: 1 },
      opciones: [opcion('op_a', 'A'), opcion('op_b', 'B')],
    });
    montar(multiple, { opciones: ['op_a'] });
    expect(screen.getByRole('checkbox', { name: 'A' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'B' })).toBeDisabled();
    expect(screen.getByText(/llevas 1/i)).toBeInTheDocument();
  });

  it('el desplegable emite el id de la opción, no su texto', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({
      id: 'pr',
      tipo: 'desplegable',
      opciones: [opcion('op_agro', 'Agropecuario')],
    });
    const { onChange } = montar(p);
    await usuario.selectOptions(screen.getByRole('combobox'), 'op_agro');
    expect(ultimo(onChange)).toEqual({ opciones: ['op_agro'] });
  });

  it('verdadero/falso se presenta como control segmentado y sigue siendo un grupo de radios', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({
      id: 'pr',
      tipo: 'verdadero_falso',
      opciones: [opcion('op_v', 'Verdadero'), opcion('op_f', 'Falso')],
    });
    const { onChange } = montar(p);
    const grupo = screen.getByRole('radiogroup');
    await usuario.click(within(grupo).getByRole('radio', { name: 'Falso' }));
    expect(ultimo(onChange)).toEqual({ opciones: ['op_f'] });
  });
});

/* ========================================================================== */

describe('texto y números', () => {
  it('el texto corto emite una cadena', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montarControlado(pregunta({ id: 'pr', tipo: 'texto_corto' }));
    await usuario.type(screen.getByRole('textbox'), 'hola');
    expect(ultimo(onChange)).toEqual({ valor: 'hola' });
  });

  /**
   * El calificador compara valores numéricos. Una cadena `"1250"` no es igual a `1250`
   * en el servidor, así que el control tiene que convertir.
   */
  it('el número emite un NÚMERO, no la cadena del input', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montarControlado(pregunta({ id: 'pr', tipo: 'numero' }));
    await usuario.type(screen.getByRole('spinbutton'), '42');
    expect(ultimo(onChange)).toEqual({ valor: 42 });
  });

  it('vaciar un número emite null y no NaN', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montar(pregunta({ id: 'pr', tipo: 'numero' }), { valor: 5 });
    await usuario.clear(screen.getByRole('spinbutton'));
    expect(ultimo(onChange)).toEqual({ valor: null });
  });

  it('muestra el prefijo de la moneda y el sufijo del porcentaje', () => {
    const { unmount } = montar(
      pregunta({ id: 'pr', tipo: 'moneda', configuracion: { moneda: 'BOB' } }),
    );
    expect(screen.getByText('BOB')).toBeInTheDocument();
    unmount();
    montar(pregunta({ id: 'pr', tipo: 'porcentaje' }));
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('el texto largo cuenta caracteres y avisa del mínimo que falta', async () => {
    const usuario = userEvent.setup();
    montar(
      pregunta({
        id: 'pr',
        tipo: 'texto_largo',
        configuracion: { minimoCaracteres: 10, maximoCaracteres: 100 },
      }),
      { valor: 'corto' },
    );
    expect(screen.getByText('5 / 100')).toBeInTheDocument();
    expect(screen.getByText(/faltan 5 caracteres/i)).toBeInTheDocument();
    await usuario.type(screen.getByRole('textbox'), 'x');
  });
});

/* ========================================================================== */

describe('escalas', () => {
  it('la escala lineal emite el punto elegido como número', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({
      id: 'pr',
      tipo: 'escala_lineal',
      configuracion: { minimo: 1, maximo: 5, paso: 1 },
    });
    const { onChange } = montar(p);
    await usuario.click(screen.getByRole('radio', { name: '4' }));
    expect(ultimo(onChange)).toEqual({ valor: 4 });
  });

  it('las estrellas son radios con nombre accesible', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({ id: 'pr', tipo: 'estrellas', configuracion: { estrellas: 5 } });
    const { onChange } = montar(p);
    await usuario.click(screen.getByRole('radio', { name: '3 de 5' }));
    expect(ultimo(onChange)).toEqual({ valor: 3 });
  });

  /**
   * Un deslizador sin valor arranca en el mínimo, y si eso se enviara como respuesta,
   * toda pregunta opcional con deslizador quedaría «respondida» con el mínimo sin que
   * nadie la tocara. El marcador muestra un guion mientras no hay respuesta.
   */
  it('el deslizador no finge una respuesta antes de que se toque', () => {
    const p = pregunta({
      id: 'pr',
      tipo: 'deslizador',
      configuracion: { minimo: 0, maximo: 100, paso: 5 },
    });
    const { onChange } = montarControlado(p);
    // Sin respuesta, el marcador muestra un guion en lugar del mínimo.
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    // jsdom no mueve un `input[type=range]` con teclado ni con clic; el evento de
    // cambio es la forma fiable de simular el arrastre.
    fireEvent.change(screen.getByRole('slider'), { target: { value: '35' } });
    expect(ultimo(onChange)).toEqual({ valor: 35 });
    expect(screen.getByText('35')).toBeInTheDocument();
  });
});

/* ========================================================================== */

describe('cuadrículas', () => {
  const matriz = pregunta({
    id: 'pr',
    tipo: 'cuadricula_opcion',
    configuracion: { columnasMatriz: ['Bajo', 'Alto'] },
    opciones: [opcion('f_excel', 'Hojas de cálculo'), opcion('f_sql', 'SQL')],
  });

  /**
   * El valor es `{ filaId: ETIQUETA_DE_COLUMNA }`. El calificador compara con
   * `claveEmparejamiento`, que el autor escribe como texto de columna: mandar un índice
   * produciría siempre una respuesta incorrecta y nadie lo notaría hasta ver las notas.
   */
  it('emite fila → etiqueta de columna, no un índice', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montar(matriz);
    await usuario.click(screen.getByRole('radio', { name: 'Hojas de cálculo: Alto' }));
    expect(ultimo(onChange)).toEqual({ valor: { f_excel: 'Alto' } });
  });

  it('es una tabla con encabezados de fila y de columna', () => {
    montar(matriz);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Alto' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Hojas de cálculo' })).toBeInTheDocument();
  });

  it('la cuadrícula de casillas acumula varias columnas por fila', async () => {
    const usuario = userEvent.setup();
    const p = { ...matriz, tipo: 'cuadricula_casillas' };
    const { onChange } = montar(p, { valor: { f_excel: ['Bajo'] } });
    await usuario.click(screen.getByRole('checkbox', { name: 'Hojas de cálculo: Alto' }));
    expect(ultimo(onChange)).toEqual({ valor: { f_excel: ['Bajo', 'Alto'] } });
  });

  /**
   * Sin columnas no se puede responder. Inventar un formato produciría filas que nadie
   * podría revisar; decirlo permite que el reclutador corrija la evaluación.
   */
  it('avisa en lugar de inventar cuando no hay columnas configuradas', () => {
    montar(pregunta({ id: 'pr', tipo: 'cuadricula_opcion', opciones: [opcion('f', 'Fila')] }));
    expect(screen.getByText(/no tiene columnas configuradas/i)).toBeInTheDocument();
  });
});

/* ========================================================================== */

describe('ordenar', () => {
  const ordenar = pregunta({
    id: 'pr',
    tipo: 'ordenar',
    opciones: [opcion('o1', 'Primero'), opcion('o2', 'Segundo'), opcion('o3', 'Tercero')],
  });

  /**
   * El orden inicial es EXACTAMENTE el que llegó del servidor: ya viene mezclado de
   * forma determinista por intento. Reordenarlo aquí cambiaría la prueba al recargar.
   */
  it('respeta el orden que envió el servidor', () => {
    montar(ordenar);
    const elementos = screen.getAllByRole('listitem');
    expect(elementos[0]).toHaveTextContent('Primero');
    expect(elementos[2]).toHaveTextContent('Tercero');
  });

  /**
   * Un control que sólo se opera arrastrando excluye a quien no usa ratón, y en una
   * evaluación eso es excluir a la persona del proceso. Los botones son la vía
   * principal; arrastrar es un extra.
   */
  it('se puede reordenar con botones, con nombre accesible que dice a dónde va', async () => {
    const usuario = userEvent.setup();
    const { onChange } = montar(ordenar);
    await usuario.click(screen.getByRole('button', { name: /bajar «Primero» a la posición 2/i }));
    expect(ultimo(onChange)).toEqual({ valor: ['o2', 'o1', 'o3'] });
  });

  it('el primero no se puede subir y el último no se puede bajar', () => {
    montar(ordenar);
    expect(screen.getByRole('button', { name: /subir «Primero»/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /bajar «Tercero»/i })).toBeDisabled();
  });
});

/* ========================================================================== */

describe('emparejar y clasificar', () => {
  it('clasificar ofrece los grupos del autor y emite opción → grupo', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({
      id: 'pr',
      tipo: 'clasificar',
      configuracion: { grupos: ['Activo', 'Pasivo'] },
      opciones: [opcion('op_caja', 'Caja')],
    });
    const { onChange } = montar(p);
    await usuario.selectOptions(screen.getByRole('combobox', { name: /destino de «Caja»/i }), 'Activo');
    expect(ultimo(onChange)).toEqual({ valor: { op_caja: 'Activo' } });
  });

  /**
   * En `emparejar` las parejas correctas viven en `claveEmparejamiento` y el servidor
   * no las publica. Si el autor rellenó `grupos`, se aprovecha para ofrecer un
   * desplegable —mucho mejor que teclear a ciegas— y si no, se cae al texto libre.
   */
  it('emparejar usa desplegable si hay grupos y texto libre si no', async () => {
    const usuario = userEvent.setup();
    const conGrupos = pregunta({
      id: 'pr',
      tipo: 'emparejar',
      configuracion: { grupos: ['Liquidez'] },
      opciones: [opcion('op_rc', 'Razón corriente')],
    });
    const { unmount } = montar(conGrupos);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    unmount();

    const sinGrupos = pregunta({
      id: 'pr',
      tipo: 'emparejar',
      opciones: [opcion('op_rc', 'Razón corriente')],
    });
    const { onChange } = montarControlado(sinGrupos);
    const campo = screen.getByRole('textbox', { name: /pareja de «Razón corriente»/i });
    await usuario.type(campo, 'Liquidez');
    expect(ultimo(onChange)).toEqual({ valor: { op_rc: 'Liquidez' } });
  });
});

/* ========================================================================== */

describe('rellenar huecos', () => {
  /**
   * Los campos van DENTRO de la frase, no en una lista al pie. Y las claves son
   * `h1…hn` en el orden de aparición, exactamente como las numera el runner del ATS:
   * si los dos numeraran distinto, la misma respuesta se calificaría de forma distinta
   * según por dónde entró el candidato.
   */
  it('dibuja un campo por hueco, numerado h1…hn en orden', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({
      id: 'pr',
      tipo: 'rellenar_huecos',
      enunciado: texto('La razón ______ mide la liquidez y la razón de ______ mide la deuda.'),
    });
    const { onChange } = montarControlado(p);

    const primero = screen.getByRole('textbox', { name: 'Hueco 1 de 2' });
    const segundo = screen.getByRole('textbox', { name: 'Hueco 2 de 2' });
    expect(primero).toBeInTheDocument();
    expect(segundo).toBeInTheDocument();

    await usuario.type(primero, 'corriente');
    expect(ultimo(onChange)).toEqual({ valor: { h1: 'corriente' } });
  });

  it('sin ningún hueco marcado deja un campo suelto, para no dejar la pregunta muda', () => {
    montar(pregunta({ id: 'pr', tipo: 'rellenar_huecos', enunciado: texto('Sin huecos.') }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

/* ========================================================================== */

describe('congelado', () => {
  it('bloquea todos los controles cuando el intento ya no admite cambios', () => {
    const p = pregunta({
      id: 'pr',
      tipo: 'opcion_unica',
      opciones: [opcion('op_a', 'A')],
    });
    render(
      <AnswerControl
        pregunta={p}
        valor={undefined}
        onChange={vi.fn()}
        bloqueado
        bloquearPegado={false}
        onPegar={vi.fn()}
        onCopiar={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled();
  });
});

/* ========================================================================== */

describe('portapapeles', () => {
  it('registra la LONGITUD de lo pegado, nunca el contenido', async () => {
    const usuario = userEvent.setup();
    const onPegar = vi.fn();
    render(
      <AnswerControl
        pregunta={pregunta({ id: 'pr', tipo: 'texto_largo' })}
        valor={undefined}
        onChange={vi.fn()}
        bloqueado={false}
        bloquearPegado={false}
        onPegar={onPegar}
        onCopiar={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole('textbox'));
    await usuario.paste('una respuesta traída de fuera');

    expect(onPegar).toHaveBeenCalledWith('una respuesta traída de fuera'.length);
    // El contenido no viaja en ningún argumento.
    for (const llamada of onPegar.mock.calls) {
      expect(llamada.every((argumento) => typeof argumento === 'number')).toBe(true);
    }
  });

  it('impide pegar cuando el autor lo desactivó, pero lo registra igual', async () => {
    const usuario = userEvent.setup();
    const onPegar = vi.fn();
    const onChange = vi.fn();
    render(
      <AnswerControl
        pregunta={pregunta({ id: 'pr', tipo: 'texto_largo' })}
        valor={undefined}
        onChange={onChange}
        bloqueado={false}
        bloquearPegado
        onPegar={onPegar}
        onCopiar={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole('textbox'));
    await usuario.paste('texto pegado');
    expect(onPegar).toHaveBeenCalledWith('texto pegado'.length);
    expect(onChange).not.toHaveBeenCalled();
  });
});

/* ========================================================================== */

describe('casilla de aceptación', () => {
  /**
   * En el catálogo del servidor es una pregunta de **opción única** con una sola
   * opción, y su valor viaja como `{ opciones: ["op_si"] }`. Pero para quien la
   * responde no es «elige una entre varias»: es «marca esta casilla para declarar
   * algo». Un radio solitario ahí confunde —parece que falta la otra opción— y no es
   * lo que nadie espera de una declaración.
   *
   * Así que se dibuja como casilla y **el valor enviado no cambia**, que es lo que
   * comprueba esta prueba.
   */
  it('se dibuja como casilla pero emite el valor de opción única', async () => {
    const usuario = userEvent.setup();
    const p = pregunta({
      id: 'pr',
      tipo: 'casilla_aceptacion',
      opciones: [opcion('op_si', 'Sí, lo declaro')],
    });
    const { onChange } = montarControlado(p);

    const casilla = screen.getByRole('checkbox', { name: /lo declaro/i });
    expect(casilla).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();

    await usuario.click(casilla);
    expect(ultimo(onChange)).toEqual({ opciones: ['op_si'] });

    // Y se puede desmarcar: una declaración marcada por error tiene que poder deshacerse.
    await usuario.click(casilla);
    expect(ultimo(onChange)).toEqual({ opciones: [] });
  });
});
