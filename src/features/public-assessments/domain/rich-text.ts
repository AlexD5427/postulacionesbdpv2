/**
 * Texto enriquecido: saneamiento y proyección a texto plano.
 *
 * El backend guarda todo campo con formato (enunciados, ayudas, instrucciones,
 * descripciones de sección, textos de opción) como un documento de bloques y
 * fragmentos, **nunca como HTML**:
 *
 *   { "v": 1, "b": [ { "t": "p", "s": [ { "x": "mora de 45 días", "m": ["b"] } ] } ] }
 *
 * ── Por qué importa aquí ─────────────────────────────────────────────────────
 * Guardar HTML obligaría a cada consumidor a defenderse de `<script>` y de
 * atributos peligrosos, y basta que uno se olvide para tener XSS. Con este modelo
 * lo único que puede existir es texto y un puñado de marcas de una lista blanca,
 * así que renderizarlo es seguro **por construcción**: no hay nada que sanear en
 * el momento de pintar.
 *
 * Este archivo sanea igualmente lo que llega, por dos razones que no son
 * paranoia:
 *  · el modelo admite una cadena suelta (un importador simple o un cliente
 *    antiguo pueden mandar texto plano), y hay que normalizarla;
 *  · un `l` con `javascript:` tiene que desaparecer antes de llegar a un `href`,
 *    y confiar en que el servidor ya lo hizo deja el módulo a merced de un
 *    despliegue desactualizado.
 *
 * La regla de renderizado es absoluta y está probada: **ni `innerHTML` ni
 * `dangerouslySetInnerHTML` en ninguna parte de este módulo.**
 */

import {
  BLOQUES_RICOS,
  MARCAS_RICAS,
  type BloqueRico,
  type BloqueRicoTipo,
  type DocRico,
  type FragmentoRico,
  type MarcaRica,
} from './contract';

/** Límites del backend (`EV_RT_LIMITS`), replicados para no crecer sin techo. */
const LIMITES = {
  BLOQUES: 60,
  FRAGMENTOS_POR_BLOQUE: 80,
  CARACTERES_FRAGMENTO: 4000,
  CARACTERES_TOTAL: 20000,
  CARACTERES_ENLACE: 600,
} as const;

/** Versión del modelo que este módulo entiende. */
export const VERSION_TEXTO_ENRIQUECIDO = 1;

export function docRicoVacio(): DocRico {
  return { v: VERSION_TEXTO_ENRIQUECIDO, b: [] };
}

/**
 * Enlace admisible: solo `http`, `https` y `mailto`.
 *
 * Cualquier otra cosa (`javascript:`, `data:`, rutas relativas) se descarta en
 * silencio: el enlace desaparece y el texto se conserva, que es lo que el
 * candidato necesita. Réplica de `evRichSafeLink_`.
 */
export function enlaceSeguro(valor: unknown): string {
  const url = String(valor ?? '')
    .slice(0, LIMITES.CARACTERES_ENLACE)
    .trim();
  if (!url) return '';
  if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return url;
  return '';
}

function esBloqueValido(tipo: string): tipo is BloqueRicoTipo {
  return (BLOQUES_RICOS as readonly string[]).includes(tipo);
}

function esMarcaValida(marca: string): marca is MarcaRica {
  return (MARCAS_RICAS as readonly string[]).includes(marca);
}

/** Texto plano → documento de un párrafo por línea. */
export function docRicoDesdeTexto(texto: unknown): DocRico {
  const bruto = String(texto ?? '');
  if (!bruto) return docRicoVacio();
  const bloques: BloqueRico[] = bruto
    .split(/\r?\n/)
    .slice(0, LIMITES.BLOQUES)
    .map((linea) => ({
      t: 'p' as BloqueRicoTipo,
      s: [{ x: linea.slice(0, LIMITES.CARACTERES_FRAGMENTO) }],
    }));
  return { v: VERSION_TEXTO_ENRIQUECIDO, b: bloques };
}

function fragmentoSaneado(bruto: unknown, presupuesto: number): FragmentoRico | null {
  let texto: unknown;
  const marcas: MarcaRica[] = [];
  let enlace = '';

  if (typeof bruto === 'string') {
    texto = bruto;
  } else if (bruto && typeof bruto === 'object') {
    const objeto = bruto as { x?: unknown; text?: unknown; m?: unknown; marks?: unknown; l?: unknown; link?: unknown };
    texto = objeto.x === undefined ? objeto.text : objeto.x;
    const marcasBrutas = Array.isArray(objeto.m)
      ? objeto.m
      : Array.isArray(objeto.marks)
        ? objeto.marks
        : [];
    for (const marca of marcasBrutas) {
      const nombre = String(marca);
      if (esMarcaValida(nombre) && !marcas.includes(nombre)) marcas.push(nombre);
    }
    enlace = enlaceSeguro(objeto.l === undefined ? objeto.link : objeto.l);
  } else {
    return null;
  }

  let limpio = String(texto ?? '').slice(0, LIMITES.CARACTERES_FRAGMENTO);
  if (limpio === '') return null;
  if (limpio.length > presupuesto) limpio = limpio.slice(0, Math.max(0, presupuesto));
  if (limpio === '') return null;

  return {
    x: limpio,
    ...(marcas.length > 0 ? { m: marcas } : {}),
    ...(enlace ? { l: enlace } : {}),
  };
}

/**
 * Sanea cualquier cosa que llegue y devuelve un documento válido.
 *
 * Nunca lanza: lo que no encaja se descarta. Un renderizador que puede recibir
 * `null`, una cadena, un arreglo de bloques o el modelo completo y en todos los
 * casos pinta algo sensato es lo que evita que una evaluación con un campo raro
 * deje la pantalla en blanco.
 */
export function sanearDocRico(entrada: unknown): DocRico {
  if (entrada === null || entrada === undefined || entrada === '') return docRicoVacio();

  if (typeof entrada === 'string') {
    const analizado = intentarJson(entrada);
    return analizado && typeof analizado === 'object'
      ? sanearDocRico(analizado)
      : docRicoDesdeTexto(entrada);
  }
  if (Array.isArray(entrada)) return sanearDocRico({ v: VERSION_TEXTO_ENRIQUECIDO, b: entrada });
  if (typeof entrada !== 'object') return docRicoDesdeTexto(String(entrada));

  const objeto = entrada as { b?: unknown; blocks?: unknown };
  const bloquesBrutos = Array.isArray(objeto.b)
    ? objeto.b
    : Array.isArray(objeto.blocks)
      ? objeto.blocks
      : [];

  const salida: BloqueRico[] = [];
  let total = 0;

  for (const bruto of bloquesBrutos) {
    if (salida.length >= LIMITES.BLOQUES || total >= LIMITES.CARACTERES_TOTAL) break;
    if (!bruto || typeof bruto !== 'object') continue;
    const bloque = bruto as { t?: unknown; type?: unknown; s?: unknown; spans?: unknown };
    const tipoBruto = String(bloque.t ?? bloque.type ?? 'p');
    const tipo: BloqueRicoTipo = esBloqueValido(tipoBruto) ? tipoBruto : 'p';

    const fragmentosBrutos = Array.isArray(bloque.s)
      ? bloque.s
      : Array.isArray(bloque.spans)
        ? bloque.spans
        : [];

    const fragmentos: FragmentoRico[] = [];
    for (const fragmentoBruto of fragmentosBrutos) {
      if (fragmentos.length >= LIMITES.FRAGMENTOS_POR_BLOQUE) break;
      const fragmento = fragmentoSaneado(fragmentoBruto, LIMITES.CARACTERES_TOTAL - total);
      if (!fragmento) continue;
      total += fragmento.x.length;
      fragmentos.push(fragmento);
      if (total >= LIMITES.CARACTERES_TOTAL) break;
    }
    // Un bloque sin fragmentos es una línea en blanco deliberada; se conserva
    // sólo si después viene más contenido (el recorte final los quita).
    salida.push({ t: tipo, s: fragmentos });
  }

  while (salida.length > 0) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && ultimo.s.length === 0) salida.pop();
    else break;
  }

  return { v: VERSION_TEXTO_ENRIQUECIDO, b: salida };
}

function intentarJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Proyección a texto plano.
 *
 * La usan los `aria-label`, los `<option>` de un desplegable y el resumen de
 * preguntas pendientes, donde un nodo de React no sirve y hace falta una cadena.
 */
export function textoPlanoDe(entrada: unknown): string {
  const doc = sanearDocRico(entrada);
  const lineas: string[] = [];
  let ordinal = 0;
  for (const bloque of doc.b) {
    const texto = bloque.s.map((fragmento) => fragmento.x).join('');
    if (bloque.t === 'ul') {
      lineas.push(`• ${texto}`);
      ordinal = 0;
    } else if (bloque.t === 'ol') {
      ordinal += 1;
      lineas.push(`${ordinal}. ${texto}`);
    } else {
      ordinal = 0;
      lineas.push(texto);
    }
  }
  return lineas.join('\n').trim();
}

/** Versión de una sola línea, para etiquetas y resúmenes. */
export function textoPlanoBreve(entrada: unknown, maximo = 140): string {
  const plano = textoPlanoDe(entrada).replace(/\s+/g, ' ').trim();
  return plano.length > maximo ? `${plano.slice(0, maximo - 1)}…` : plano;
}

/** ¿El documento no tiene ningún carácter visible? */
export function docRicoVacioP(entrada: unknown): boolean {
  return textoPlanoDe(entrada).replace(/\s+/g, '') === '';
}

/**
 * Agrupa los bloques de lista consecutivos.
 *
 * Sin esto, cada elemento sería su propia `<ul>`: además de ser HTML incorrecto,
 * reinicia la numeración de las listas ordenadas y hace que un lector de pantalla
 * anuncie «lista de un elemento» una vez por línea.
 */
export type GrupoBloques =
  | { tipo: 'lista-ul'; bloques: BloqueRico[] }
  | { tipo: 'lista-ol'; bloques: BloqueRico[] }
  | { tipo: 'suelto'; bloque: BloqueRico };

export function agruparBloques(bloques: BloqueRico[]): GrupoBloques[] {
  const grupos: GrupoBloques[] = [];
  for (const bloque of bloques) {
    if (bloque.t === 'ul' || bloque.t === 'ol') {
      const tipo = bloque.t === 'ul' ? 'lista-ul' : 'lista-ol';
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.tipo === tipo) {
        ultimo.bloques.push(bloque);
        continue;
      }
      grupos.push({ tipo, bloques: [bloque] });
      continue;
    }
    grupos.push({ tipo: 'suelto', bloque });
  }
  return grupos;
}
