import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { appConfig } from '@/core/config/app-config';
import { BdpMark, type BdpTone } from './brand/BdpMark';

/**
 * Brand lockup: the official BDP isotype + the "BDP · Talento" wordmark.
 *
 * `tone` controls the isotype fill so the lockup reads on light, dark and brand
 * gradient surfaces. The text colour is driven by `currentColor` on light/dark
 * and forced white when placed over a brand panel.
 */
export function Logo({
  className,
  href = '/',
  tone = 'brand',
  onBrand = false,
}: {
  className?: string;
  href?: string;
  tone?: BdpTone;
  /** When true, the wordmark is rendered white for placement over brand panels. */
  onBrand?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={`${appConfig.shortName} — ${appConfig.organization.legalName}`}
    >
      <span
        className={cn(
          'grid h-10 w-10 place-items-center rounded-2xl p-1.5 shadow-glass-sm transition-transform duration-[var(--duration-md)] ease-[var(--ease-spring-soft)] group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100',
          onBrand ? 'bg-white/15 backdrop-blur' : 'glass-subtle',
        )}
      >
        <BdpMark tone={tone} className="h-full w-full" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-sm font-extrabold tracking-tight',
            onBrand ? 'text-white' : 'text-foreground',
          )}
        >
          BDP
        </span>
        <span
          className={cn(
            'text-[0.62rem] font-semibold uppercase tracking-[0.22em]',
            onBrand ? 'text-on-brand-muted' : 'text-muted-foreground',
          )}
        >
          Talento
        </span>
      </span>
    </Link>
  );
}
