import type { SVGProps } from 'react';
import type { BdpTone } from './BdpMark';

/**
 * BDP lettermark — the "BDP" glyphs from the official logo (B and D in blue, P
 * in cyan), reconstructed from the brand SVG. Pairs with <BdpMark/> to form the
 * full logotype, or stands alone as an oversized editorial wordmark.
 */
const BLUE = '#004282';
const CYAN = '#00b0d8';

export function BdpLettermark({
  tone = 'brand',
  title,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { tone?: BdpTone; title?: string }) {
  const gradientId = 'bdp-letters-grad';
  const a = tone === 'brand' ? BLUE : tone === 'white' ? '#ffffff' : tone === 'gradient' ? `url(#${gradientId})` : 'currentColor';
  const b = tone === 'brand' ? CYAN : tone === 'white' ? '#ffffff' : tone === 'gradient' ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg
      viewBox="53 9 92 31"
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
      {/* B */}
      <path
        fill={a}
        d="M76.81,23.72s3.37-1.1,3.37-6.8S75.56,9.55,72,9.55H55.83a2.27,2.27,0,0,0-2.32,2.21v26a1.77,1.77,0,0,0,1.77,1.77h17.5c3.2,0,8.86-1.29,8.86-8.66C81.64,24.44,76.81,23.72,76.81,23.72Zm-15-6.44A1.17,1.17,0,0,1,63,16.1h5.42c2.2.08,2.47.76,2.47,2.57,0,2.4-.67,2.88-3.41,2.88H61.86ZM67.78,33H61.86V28.14a1,1,0,0,1,1-1h5.07c2.55,0,3.45.36,3.45,2.85S70.32,33,67.78,33Z"
      />
      {/* D */}
      <path
        fill={a}
        d="M85.05,11.85a2.35,2.35,0,0,1,2.39-2.32h13.29c8.62,0,12.46,3.13,12.46,11.66v6.28c0,8.21-2.73,12.1-11.35,12.1H85.05ZM93.3,32.34h7.22c3,0,4.17-2,4.17-5.12V20.93c0-3.88-1.28-4.68-4.17-4.68h-6.2a1,1,0,0,0-1,1Z"
      />
      {/* P */}
      <path
        fill={b}
        d="M116.6,39.57V11.87a2.45,2.45,0,0,1,2.55-2.34h14.2c8.27,0,11.38,3.17,11.38,11,0,8.45-2.09,11.33-11.38,11.33H128a2.42,2.42,0,0,0-2.52,2.3v5.39Zm15-14.66c3.51-.12,4-.48,4-4.36,0-3.09-.53-4.05-4-4.05h-4.86a1.23,1.23,0,0,0-1.23,1.23v7.18Z"
      />
    </svg>
  );
}
