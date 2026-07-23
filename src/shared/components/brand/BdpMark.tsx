import type { SVGProps } from 'react';

/**
 * BDP isotype — the cluster of five rounded hexagonal tiles from the official
 * Banco de Desarrollo Productivo logo, reconstructed faithfully from the brand
 * SVG. This is the compact mark used in the dock, navbar, preloader and favicon.
 *
 * `tone` controls how it fills so it reads on any surface:
 *  - `brand`    → official blue (#004282) + cyan (#00b0d8)
 *  - `mono`     → single `currentColor` (inherits text colour)
 *  - `white`    → solid white (over brand gradient panels)
 *  - `gradient` → animated brand gradient fill (hero / preloader flourish)
 */
export type BdpTone = 'brand' | 'mono' | 'white' | 'gradient';

const BLUE = '#004282';
const CYAN = '#00b0d8';

export function BdpMark({
  tone = 'brand',
  title,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { tone?: BdpTone; title?: string }) {
  const gradientId = 'bdp-mark-grad';
  const a = tone === 'brand' ? BLUE : tone === 'white' ? '#ffffff' : tone === 'gradient' ? `url(#${gradientId})` : 'currentColor';
  const b = tone === 'brand' ? CYAN : tone === 'white' ? '#ffffff' : tone === 'gradient' ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg
      viewBox="-1 -1 53 51"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {tone === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLUE} />
            <stop offset="100%" stopColor={CYAN} />
          </linearGradient>
        </defs>
      )}
      {/* cyan tile — lower left */}
      <path
        fill={b}
        d="M9.59,29.92H4.44a1.88,1.88,0,0,0-.93.25,1.78,1.78,0,0,0-.68.68L1.54,33.08.25,35.31a1.87,1.87,0,0,0,0,1.87l1.29,2.23,1.29,2.23a1.78,1.78,0,0,0,.68.68,1.88,1.88,0,0,0,.93.25H9.59a1.89,1.89,0,0,0,1.62-.93l1.28-2.23,1.29-2.23a1.87,1.87,0,0,0,0-1.87l-1.29-2.23-1.28-2.23a1.89,1.89,0,0,0-1.62-.93Z"
      />
      {/* blue tile — bottom */}
      <path
        fill={a}
        d="M26.12,36H20.64a1.82,1.82,0,0,0-1.55.89l-1.36,2.37L16.36,41.6a1.81,1.81,0,0,0-.24.9,1.75,1.75,0,0,0,.24.89l1.37,2.37,1.36,2.37a1.8,1.8,0,0,0,1.55.9h5.48a1.79,1.79,0,0,0,.89-.24,1.82,1.82,0,0,0,.66-.66L29,45.76l1.37-2.37a1.75,1.75,0,0,0,.24-.89,1.81,1.81,0,0,0-.24-.9L29,39.23l-1.37-2.37a1.72,1.72,0,0,0-.66-.65A1.7,1.7,0,0,0,26.12,36Z"
      />
      {/* cyan tile — centre */}
      <path
        fill={b}
        d="M24.52,14.57H17.16a2.75,2.75,0,0,0-1.35.36,2.69,2.69,0,0,0-1,1L13,19.11l-1.84,3.18a2.73,2.73,0,0,0,0,2.71L13,28.18l1.84,3.18a2.73,2.73,0,0,0,2.34,1.36h7.36a2.63,2.63,0,0,0,1.35-.37,2.69,2.69,0,0,0,1-1l1.84-3.18L30.54,25a2.73,2.73,0,0,0,0-2.71L28.7,19.11l-1.84-3.19a2.69,2.69,0,0,0-1-1A2.72,2.72,0,0,0,24.52,14.57Z"
      />
      {/* cyan tile — right */}
      <path
        fill={b}
        d="M44,23.59h-7a2.66,2.66,0,0,0-1.3.35,2.62,2.62,0,0,0-1,.95l-1.76,3.05-1.76,3a2.59,2.59,0,0,0,0,2.6l1.76,3,1.76,3a2.57,2.57,0,0,0,1,1,2.66,2.66,0,0,0,1.3.35h7a2.66,2.66,0,0,0,1.3-.35,2.57,2.57,0,0,0,.95-1l1.76-3,1.76-3a2.59,2.59,0,0,0,0-2.6l-1.76-3-1.76-3.05a2.62,2.62,0,0,0-.95-.95A2.66,2.66,0,0,0,44,23.59Z"
      />
      {/* blue tile — top */}
      <path
        fill={a}
        d="M43.15,0H35a2.88,2.88,0,0,0-1.44.39,2.79,2.79,0,0,0-1.05,1L30.47,5l-2,3.52a2.89,2.89,0,0,0-.39,1.44,2.83,2.83,0,0,0,.39,1.44l2,3.53,2,3.53a2.93,2.93,0,0,0,1.05,1.05,2.88,2.88,0,0,0,1.44.39h8.15a2.89,2.89,0,0,0,2.49-1.44l2-3.53,2-3.53a2.92,2.92,0,0,0,.38-1.44,3,3,0,0,0-.38-1.44L47.68,5l-2-3.53a2.72,2.72,0,0,0-1-1A2.88,2.88,0,0,0,43.15,0Z"
      />
    </svg>
  );
}
