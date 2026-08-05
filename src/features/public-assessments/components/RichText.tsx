/**
 * Renderizador del texto enriquecido.
 *
 * ── La única regla, y no admite excepciones ──────────────────────────────────
 * Se recorren bloques y fragmentos y se componen nodos de React. **No hay
 * `dangerouslySetInnerHTML` ni `innerHTML` en este archivo ni en ningún otro del
 * módulo**, y `security.test.ts` lo comprueba leyendo el código fuente.
 *
 * El modelo se diseñó precisamente para que renderizarlo fuera seguro sin sanear
 * nada en el momento de pintar: lo único que puede existir es texto y marcas de una
 * lista blanca. Meterlo en HTML tiraría ese diseño a la basura y devolvería el
 * problema del XSS a un sitio donde ya estaba resuelto.
 *
 * El documento llega ya saneado desde `payloads.ts` (los enlaces peligrosos
 * desaparecen en la frontera de red). Aquí se vuelve a sanear porque el componente
 * también se usa con datos de demostración y en pruebas, y un renderizador que
 * depende de que alguien lo haya llamado en el orden correcto es un renderizador
 * frágil.
 */

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { BloqueRico, FragmentoRico, MarcaRica } from '../domain/contract';
import { agruparBloques, sanearDocRico } from '../domain/rich-text';

const CLASE_MARCA: Record<MarcaRica, string> = {
  b: 'font-semibold text-foreground',
  i: 'italic',
  u: 'underline decoration-1 underline-offset-2',
  s: 'line-through',
  c: 'rounded bg-muted px-1 py-[1px] font-mono text-[0.92em]',
};

function Fragmento({ fragmento }: { fragmento: FragmentoRico }) {
  const clases = (fragmento.m ?? []).map((marca) => CLASE_MARCA[marca]).join(' ');
  const contenido: ReactNode = clases ? (
    <span className={clases}>{fragmento.x}</span>
  ) : (
    fragmento.x
  );

  if (!fragmento.l) return <>{contenido}</>;
  return (
    <a
      href={fragmento.l}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
    >
      {contenido}
    </a>
  );
}

function contenidoDe(bloque: BloqueRico): ReactNode {
  return bloque.s.map((fragmento, indice) => (
    <Fragmento key={indice} fragmento={fragmento} />
  ));
}

/** Un bloque suelto, con la tipografía de su tipo. */
function Bloque({ bloque, compacto }: { bloque: BloqueRico; compacto: boolean }) {
  const contenido = contenidoDe(bloque);

  switch (bloque.t) {
    case 'h1':
      // `h3` y no `h1`: el `h1` de la página es el título de la evaluación, y el
      // encabezado de un enunciado nunca debe competir con él en la jerarquía que
      // anuncia un lector de pantalla.
      return <h3 className="text-lg font-bold tracking-tight sm:text-xl">{contenido}</h3>;
    case 'h2':
      return <h4 className="text-base font-bold tracking-tight sm:text-lg">{contenido}</h4>;
    case 'h3':
      return (
        <h5 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {contenido}
        </h5>
      );
    case 'quote':
      return (
        <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
          {contenido}
        </blockquote>
      );
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-3 font-mono text-xs">
          <code>{contenido}</code>
        </pre>
      );
    default:
      return (
        <p className={compacto ? 'text-sm leading-relaxed' : 'leading-relaxed'}>{contenido}</p>
      );
  }
}

export interface RichTextProps {
  doc: unknown;
  className?: string;
  compacto?: boolean;
}

export function RichText({ doc, className, compacto = false }: RichTextProps) {
  const saneado = sanearDocRico(doc);
  if (saneado.b.length === 0) return null;

  return (
    <div className={cn('flex flex-col', compacto ? 'gap-1.5' : 'gap-2.5', className)}>
      {agruparBloques(saneado.b).map((grupo, indice) => {
        if (grupo.tipo === 'lista-ul') {
          return (
            <ul key={indice} className="ml-5 flex list-disc flex-col gap-1">
              {grupo.bloques.map((bloque, j) => (
                <li key={j} className={compacto ? 'text-sm' : undefined}>
                  {contenidoDe(bloque)}
                </li>
              ))}
            </ul>
          );
        }
        if (grupo.tipo === 'lista-ol') {
          return (
            <ol key={indice} className="ml-5 flex list-decimal flex-col gap-1">
              {grupo.bloques.map((bloque, j) => (
                <li key={j} className={compacto ? 'text-sm' : undefined}>
                  {contenidoDe(bloque)}
                </li>
              ))}
            </ol>
          );
        }
        return <Bloque key={indice} bloque={grupo.bloque} compacto={compacto} />;
      })}
    </div>
  );
}

/**
 * Versión en una sola línea, para etiquetas de opción y celdas de cuadrícula.
 *
 * Conserva las marcas y descarta la estructura de bloques: en una celda los saltos
 * de párrafo estorban más de lo que aportan.
 */
export function RichTextInline({ doc, className }: { doc: unknown; className?: string }) {
  const saneado = sanearDocRico(doc);
  const fragmentos = saneado.b.flatMap((bloque, i) =>
    bloque.s.map((fragmento, j) => ({ fragmento, clave: `${i}-${j}` })),
  );
  if (fragmentos.length === 0) return null;

  return (
    <span className={className}>
      {fragmentos.map(({ fragmento, clave }, indice) => {
        const anterior = fragmentos[indice - 1];
        const necesitaEspacio = indice > 0 && anterior !== undefined && !/\s$/.test(anterior.fragmento.x);
        return (
          <span key={clave}>
            {necesitaEspacio ? ' ' : ''}
            <Fragmento fragmento={fragmento} />
          </span>
        );
      })}
    </span>
  );
}
