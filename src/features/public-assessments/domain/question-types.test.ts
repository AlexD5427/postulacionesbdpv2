import { describe, expect, it } from 'vitest';
import { esContenido, esPregunta, esTipoConocido, especificacionDe, IDS_TIPOS, TIPOS } from './question-types';

/**
 * Paridad con el catálogo del ATS.
 *
 * ── Por qué esta lista está escrita a mano aquí ──────────────────────────────
 * Es la lista de los 39 tipos que `apps-script/evaluaciones/08_Types.gs` declara,
 * transcrita literalmente. Al estar duplicada, cualquier divergencia se convierte en
 * una prueba roja: si el ATS añade un tipo y alguien lo agrega a `question-types.ts`
 * sin actualizar esta lista (o al contrario), la suite falla y obliga a mirar el
 * contrato en lugar de descubrirlo cuando un candidato ve «tipo no soportado».
 *
 * Esa desincronización silenciosa fue exactamente el defecto de la iteración
 * anterior: declaraba 54 «familias de control» propias que ningún archivo del
 * servidor mencionaba.
 */
const TIPOS_DEL_ATS = [
  // Contenido (7)
  'contenido_titulo',
  'contenido_parrafo',
  'contenido_aviso',
  'contenido_imagen',
  'contenido_video',
  'contenido_recurso',
  'contenido_separador',
  // Texto libre (6)
  'texto_corto',
  'texto_largo',
  'correo',
  'telefono',
  'enlace',
  'codigo',
  // Números (4)
  'numero',
  'decimal',
  'porcentaje',
  'moneda',
  // Fecha y hora (4)
  'fecha',
  'hora',
  'fecha_hora',
  'duracion',
  // Opciones (7)
  'opcion_unica',
  'opcion_multiple',
  'desplegable',
  'verdadero_falso',
  'si_no_na',
  'casilla_aceptacion',
  'opcion_imagen',
  // Escalas (3)
  'escala_lineal',
  'estrellas',
  'deslizador',
  // Cuadrículas (3)
  'cuadricula_opcion',
  'cuadricula_casillas',
  'likert',
  // Estructuras ricas (4)
  'ordenar',
  'emparejar',
  'clasificar',
  'rellenar_huecos',
  // Archivos (1)
  'archivo_enlace',
].sort();

describe('catálogo de tipos', () => {
  it('declara exactamente los 39 tipos del backend, sin sobras ni faltas', () => {
    expect(IDS_TIPOS).toEqual(TIPOS_DEL_ATS);
    expect(IDS_TIPOS).toHaveLength(39);
  });

  /**
   * La forma del valor (`espera`) es lo que decide qué control se dibuja y qué manda
   * el runner. Un error aquí produce respuestas con el formato equivocado, que el
   * servidor califica como incorrectas sin que nadie sospeche del cliente.
   */
  it('la forma del valor coincide con la que espera el calificador', () => {
    const esperado: Record<string, string> = {
      opcion_unica: 'opcion',
      desplegable: 'opcion',
      verdadero_falso: 'opcion',
      si_no_na: 'opcion',
      casilla_aceptacion: 'opcion',
      opcion_imagen: 'opcion',
      opcion_multiple: 'opciones',
      texto_corto: 'texto',
      texto_largo: 'texto',
      correo: 'texto',
      telefono: 'texto',
      enlace: 'texto',
      codigo: 'texto',
      numero: 'numero',
      decimal: 'numero',
      porcentaje: 'numero',
      moneda: 'numero',
      duracion: 'numero',
      escala_lineal: 'escala',
      estrellas: 'escala',
      deslizador: 'escala',
      fecha: 'fecha',
      fecha_hora: 'fecha',
      hora: 'hora',
      cuadricula_opcion: 'matriz',
      cuadricula_casillas: 'matriz',
      likert: 'matriz',
      ordenar: 'orden',
      emparejar: 'emparejamiento',
      clasificar: 'clasificacion',
      rellenar_huecos: 'huecos',
      archivo_enlace: 'archivo',
    };
    for (const [tipo, forma] of Object.entries(esperado)) {
      expect(especificacionDe(tipo)?.espera, `tipo ${tipo}`).toBe(forma);
    }
  });

  it('marca como múltiples solo los tipos que admiten varias selecciones', () => {
    const multiples = IDS_TIPOS.filter((tipo) => TIPOS[tipo]?.multiple === true);
    expect(multiples.sort()).toEqual(['cuadricula_casillas', 'opcion_multiple']);
  });

  it('los siete bloques de contenido no son preguntas', () => {
    const contenido = IDS_TIPOS.filter((tipo) => esContenido(tipo));
    expect(contenido).toHaveLength(7);
    for (const tipo of contenido) expect(esPregunta(tipo)).toBe(false);
  });

  it('exige opciones donde el backend las exige', () => {
    const conOpciones = IDS_TIPOS.filter((tipo) => TIPOS[tipo]?.opciones === 'requeridas').sort();
    expect(conOpciones).toEqual(
      [
        'casilla_aceptacion',
        'clasificar',
        'cuadricula_casillas',
        'cuadricula_opcion',
        'desplegable',
        'emparejar',
        'likert',
        'opcion_imagen',
        'opcion_multiple',
        'opcion_unica',
        'ordenar',
        'si_no_na',
        'verdadero_falso',
      ].sort(),
    );
  });

  it('un tipo que no existe se reconoce como desconocido y no como pregunta', () => {
    expect(esTipoConocido('q_holograma_3d')).toBe(false);
    expect(esPregunta('q_holograma_3d')).toBe(false);
    expect(especificacionDe('q_holograma_3d')).toBeNull();
  });
});
