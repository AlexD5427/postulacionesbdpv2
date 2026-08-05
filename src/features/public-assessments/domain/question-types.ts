/**
 * Catálogo de tipos de bloque y pregunta — espejo de `08_Types.gs` del ATS.
 *
 * ── La lección que este archivo aplica ───────────────────────────────────────
 * El módulo anterior traducía los tipos del ATS a «familias de control» propias,
 * con nombres inventados aquí (`radio`, `checkbox`, `ordering`, `pending`…) y una
 * tabla de 54 entradas que no existía en ningún sitio del servidor. Cuando el
 * backend se reescribió con 39 tipos y otros identificadores, esa tabla dejó de
 * describir la realidad y no hubo forma de notarlo: un tipo desconocido caía en
 * `unsupported` y la pregunta se mostraba como «no soportada» en silencio.
 *
 * Aquí las claves son **literalmente** las del servidor y la agrupación es la
 * suya (`expects`), no una paralela. `question-types.test.ts` compara este
 * catálogo con la lista que el propio contrato declara: si el ATS añade un tipo y
 * aquí falta, la suite falla en lugar de degradar la pregunta.
 *
 * `expects` es lo que de verdad importa para dibujar y para enviar: los 39 tipos
 * se reducen a 11 formas de valor, y el calificador del servidor se apoya en esa
 * misma clasificación.
 */

/** Forma del valor de respuesta que el servidor espera. */
export type Forma =
  | 'ninguno'
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'hora'
  | 'opcion'
  | 'opciones'
  | 'matriz'
  | 'orden'
  | 'emparejamiento'
  | 'clasificacion'
  | 'huecos'
  | 'archivo'
  | 'escala';

export type Clase = 'contenido' | 'pregunta';

export type ExigenciaOpciones = 'ninguna' | 'requeridas' | 'opcionales';

export interface EspecificacionTipo {
  clase: Clase;
  espera: Forma;
  opciones: ExigenciaOpciones;
  /** ¿Admite varias selecciones? Relevante en opciones y cuadrículas. */
  multiple?: boolean;
}

/**
 * Los 39 tipos, con las claves exactas del servidor.
 *
 * Se conservan `clase`, `espera`, `opciones` y `multiple`. Lo demás (etiqueta,
 * icono, grupo del panel de inserción, modo de puntaje) es del editor del ATS y
 * no tiene ningún papel en el runner del candidato: incluirlo sería copiar
 * información que aquí no se puede mantener sincronizada.
 */
export const TIPOS: Record<string, EspecificacionTipo> = {
  /* ------------------------------- Contenido ------------------------------ */
  contenido_titulo: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },
  contenido_parrafo: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },
  contenido_aviso: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },
  contenido_imagen: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },
  contenido_video: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },
  contenido_recurso: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },
  contenido_separador: { clase: 'contenido', espera: 'ninguno', opciones: 'ninguna' },

  /* ------------------------------ Texto libre ----------------------------- */
  texto_corto: { clase: 'pregunta', espera: 'texto', opciones: 'ninguna' },
  texto_largo: { clase: 'pregunta', espera: 'texto', opciones: 'ninguna' },
  correo: { clase: 'pregunta', espera: 'texto', opciones: 'ninguna' },
  telefono: { clase: 'pregunta', espera: 'texto', opciones: 'ninguna' },
  enlace: { clase: 'pregunta', espera: 'texto', opciones: 'ninguna' },
  codigo: { clase: 'pregunta', espera: 'texto', opciones: 'ninguna' },

  /* -------------------------------- Números ------------------------------- */
  numero: { clase: 'pregunta', espera: 'numero', opciones: 'ninguna' },
  decimal: { clase: 'pregunta', espera: 'numero', opciones: 'ninguna' },
  porcentaje: { clase: 'pregunta', espera: 'numero', opciones: 'ninguna' },
  moneda: { clase: 'pregunta', espera: 'numero', opciones: 'ninguna' },

  /* ------------------------------ Fecha y hora ---------------------------- */
  fecha: { clase: 'pregunta', espera: 'fecha', opciones: 'ninguna' },
  hora: { clase: 'pregunta', espera: 'hora', opciones: 'ninguna' },
  fecha_hora: { clase: 'pregunta', espera: 'fecha', opciones: 'ninguna' },
  duracion: { clase: 'pregunta', espera: 'numero', opciones: 'ninguna' },

  /* ------------------------------- Opciones ------------------------------- */
  opcion_unica: { clase: 'pregunta', espera: 'opcion', opciones: 'requeridas', multiple: false },
  opcion_multiple: { clase: 'pregunta', espera: 'opciones', opciones: 'requeridas', multiple: true },
  desplegable: { clase: 'pregunta', espera: 'opcion', opciones: 'requeridas', multiple: false },
  verdadero_falso: { clase: 'pregunta', espera: 'opcion', opciones: 'requeridas', multiple: false },
  si_no_na: { clase: 'pregunta', espera: 'opcion', opciones: 'requeridas', multiple: false },
  casilla_aceptacion: { clase: 'pregunta', espera: 'opcion', opciones: 'requeridas', multiple: false },
  opcion_imagen: { clase: 'pregunta', espera: 'opcion', opciones: 'requeridas', multiple: false },

  /* -------------------------------- Escalas ------------------------------- */
  escala_lineal: { clase: 'pregunta', espera: 'escala', opciones: 'ninguna' },
  estrellas: { clase: 'pregunta', espera: 'escala', opciones: 'ninguna' },
  deslizador: { clase: 'pregunta', espera: 'escala', opciones: 'ninguna' },

  /* ------------------------------ Cuadrículas ----------------------------- */
  cuadricula_opcion: { clase: 'pregunta', espera: 'matriz', opciones: 'requeridas', multiple: false },
  cuadricula_casillas: { clase: 'pregunta', espera: 'matriz', opciones: 'requeridas', multiple: true },
  likert: { clase: 'pregunta', espera: 'matriz', opciones: 'requeridas', multiple: false },

  /* --------------------------- Estructuras ricas -------------------------- */
  ordenar: { clase: 'pregunta', espera: 'orden', opciones: 'requeridas' },
  emparejar: { clase: 'pregunta', espera: 'emparejamiento', opciones: 'requeridas' },
  clasificar: { clase: 'pregunta', espera: 'clasificacion', opciones: 'requeridas' },
  rellenar_huecos: { clase: 'pregunta', espera: 'huecos', opciones: 'ninguna' },

  /* -------------------------------- Archivos ------------------------------ */
  archivo_enlace: { clase: 'pregunta', espera: 'archivo', opciones: 'ninguna' },
};

export const IDS_TIPOS: string[] = Object.keys(TIPOS).sort();

export function especificacionDe(tipo: string): EspecificacionTipo | null {
  return TIPOS[tipo] ?? null;
}

/** ¿Recoge una respuesta? Los bloques de contenido no. */
export function esPregunta(tipo: string): boolean {
  return especificacionDe(tipo)?.clase === 'pregunta';
}

/** ¿Es un bloque de contenido (título, párrafo, imagen, separador…)? */
export function esContenido(tipo: string): boolean {
  return especificacionDe(tipo)?.clase === 'contenido';
}

/**
 * ¿El runner sabe dibujar este tipo?
 *
 * Todos los tipos declarados tienen control. Un tipo que el ATS añada y aquí no
 * exista es «desconocido»: se muestra un aviso honesto y **no se envía ninguna
 * respuesta inventada**. Que una pregunta desconocida no bloquee el envío es
 * deliberado: el candidato no puede arreglar un desajuste entre dos despliegues.
 */
export function esTipoConocido(tipo: string): boolean {
  return especificacionDe(tipo) !== null;
}
