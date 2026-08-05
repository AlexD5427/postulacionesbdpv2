/**
 * El **Número identificador** del participante.
 *
 * Formato: `CarnetDeIdentidad-NúmeroDeProceso-Año`, por ejemplo
 * `1234567-12-2026` o `8765432LP-4-2026`.
 *
 * ── Qué identifica y qué no ──────────────────────────────────────────────────
 * Este número identifica **a la persona dentro de un proceso de selección**. NO
 * identifica la evaluación: eso lo hace el código público (`EV-XXXX-1234`), que
 * viaja en el enlace de la invitación. Confundir las dos cosas es lo que haría
 * imposible que dos candidatos rindieran la misma prueba, o que un candidato
 * rindiera dos pruebas del mismo proceso.
 *
 * ── Cómo se registra en la hoja de cálculo ───────────────────────────────────
 * Las tres partes se aprovechan, cada una donde le sirve al reclutador:
 *
 *  · el **carnet** viaja como `participante.documento` y aterriza en la columna
 *    `participante_documento` de la hoja `Intentos`. Es además la clave con la
 *    que el backend reconoce a quien vuelve (`evStartAttempt_` retoma el intento
 *    en curso del mismo documento) y con la que aplica el límite de intentos;
 *  · el **número identificador completo** viaja como `procesoId` en la raíz del
 *    payload y aterriza en la columna `proceso_id`, sin depender de que el autor
 *    haya activado ningún campo opcional: `evStartAttempt_` la escribe siempre;
 *  · además se manda como campo `proceso` del participante, que el backend
 *    guarda en `participante_json` **si** el autor activó ese campo. Es
 *    redundante a propósito: la columna `proceso_id` es la garantía y el campo es
 *    la comodidad de verlo junto al resto de los datos.
 *
 * El año no se envía por separado porque va dentro del número completo y no
 * existe columna para él; extraerlo sirve para validar y para mostrarlo.
 */

/**
 * Partes del número identificador.
 *
 * `completo` es la forma canónica (mayúsculas, sin espacios): es exactamente lo
 * que se registra, para que lo que el reclutador ve en la hoja coincida carácter
 * por carácter con lo que el candidato escribió.
 */
export interface NumeroIdentificador {
  completo: string;
  carnet: string;
  proceso: string;
  anio: number;
}

export type MotivoNumeroInvalido =
  | 'vacio'
  | 'formato'
  | 'carnet'
  | 'proceso'
  | 'anio_no_numerico'
  | 'anio_fuera_de_rango';

export type ResultadoNumero =
  | { ok: true; valor: NumeroIdentificador }
  | { ok: false; motivo: MotivoNumeroInvalido; mensaje: string };

/** Año mínimo aceptado. Antes de esto el sistema de reclutamiento no existía. */
const ANIO_MINIMO = 2020;

/**
 * Normaliza lo que el candidato escribió.
 *
 * Se aceptan espacios alrededor de los guiones y dentro del carnet (`1234567 LP`
 * es la forma en que muchas personas escriben su documento), guiones largos que
 * algunos teclados y correctores insertan, y minúsculas. Rechazar por un espacio
 * de más sería hostil sin ganar nada: el dato es el mismo.
 */
export function normalizarNumeroIdentificador(bruto: string): string {
  return String(bruto ?? '')
    .trim()
    .toUpperCase()
    // Guiones tipográficos → guion normal.
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    // Espacios alrededor del separador.
    .replace(/\s*-\s*/g, '-')
    // Espacios internos del carnet (`1234567 LP` → `1234567LP`).
    .replace(/\s+/g, '');
}

/** Año máximo aceptado: el siguiente al actual, para invitaciones adelantadas. */
function anioMaximo(hoy: Date): number {
  return hoy.getUTCFullYear() + 1;
}

/**
 * Analiza y valida un número identificador.
 *
 * Devuelve un resultado explícito en lugar de lanzar: el formulario necesita el
 * motivo para decir qué parte está mal, y «formato incorrecto» a secas es el tipo
 * de mensaje que deja a alguien mirando su propio documento sin entender nada.
 */
export function analizarNumeroIdentificador(
  bruto: string,
  { hoy = new Date() }: { hoy?: Date } = {},
): ResultadoNumero {
  const normalizado = normalizarNumeroIdentificador(bruto);
  if (!normalizado) {
    return {
      ok: false,
      motivo: 'vacio',
      mensaje: 'Escribe tu número identificador.',
    };
  }

  const partes = normalizado.split('-');
  if (partes.length !== 3) {
    return {
      ok: false,
      motivo: 'formato',
      mensaje:
        'El número identificador tiene tres partes separadas por guiones: carnet de identidad, número de proceso y año. Por ejemplo: 1234567-12-2026.',
    };
  }

  const [carnet = '', proceso = '', anioTexto = ''] = partes;

  if (!/^[A-Z0-9]{4,20}$/.test(carnet)) {
    return {
      ok: false,
      motivo: 'carnet',
      mensaje:
        'La primera parte es tu carnet de identidad: entre 4 y 20 letras o números, sin puntos ni guiones.',
    };
  }
  if (!/^\d{1,6}$/.test(proceso)) {
    return {
      ok: false,
      motivo: 'proceso',
      mensaje: 'La segunda parte es el número del proceso: solo dígitos, por ejemplo 12.',
    };
  }
  if (!/^\d{4}$/.test(anioTexto)) {
    return {
      ok: false,
      motivo: 'anio_no_numerico',
      mensaje: 'La tercera parte es el año con cuatro dígitos, por ejemplo 2026.',
    };
  }

  const anio = Number(anioTexto);
  const maximo = anioMaximo(hoy);
  if (anio < ANIO_MINIMO || anio > maximo) {
    return {
      ok: false,
      motivo: 'anio_fuera_de_rango',
      mensaje: `El año debe estar entre ${ANIO_MINIMO} y ${maximo}. Revisa la última parte del número.`,
    };
  }

  return {
    ok: true,
    valor: {
      completo: normalizado,
      carnet,
      // Sin ceros a la izquierda: `04` y `4` son el mismo proceso, y guardar dos
      // formas del mismo número obligaría al reclutador a buscar dos veces.
      proceso: String(Number(proceso)),
      anio,
    },
  };
}

/** ¿Es válido? Atajo para deshabilitar un botón sin construir el mensaje. */
export function esNumeroIdentificadorValido(bruto: string): boolean {
  return analizarNumeroIdentificador(bruto).ok;
}

/**
 * Ayuda tipográfica mientras se escribe.
 *
 * Pone en mayúsculas y limpia caracteres imposibles, pero **no** inserta guiones
 * ni reordena: un formateador que pelea con quien escribe es peor que ninguno, y
 * un carnet mal reescrito es un intento atribuido a otra persona.
 */
export function formatearMientrasEscribe(bruto: string): string {
  return String(bruto ?? '')
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Z0-9-]/g, '');
}

/* -------------------------- Código de la evaluación ----------------------- */

/**
 * Normaliza el código público de una evaluación (`EV-XXXX-1234`).
 *
 * Réplica de `evNormalizeCode_`: mayúsculas y solo `A–Z`, `0–9` y `-`. Se
 * normaliza en el cliente para que el candidato que pega el código con un espacio
 * al final no reciba «no existe ninguna evaluación con ese código».
 */
export function normalizarCodigoEvaluacion(bruto: string): string {
  return String(bruto ?? '')
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .trim();
}

/**
 * ¿Tiene pinta de código de evaluación?
 *
 * Deliberadamente laxo: comprueba que haya algo utilizable, no que siga el patrón
 * exacto. Quien decide si un código existe es el servidor, y adelantarse aquí con
 * una expresión regular estricta significaría rechazar en el navegador un código
 * legítimo el día que el ATS cambie el prefijo.
 */
export function pareceCodigoEvaluacion(bruto: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(normalizarCodigoEvaluacion(bruto));
}
