import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { appConfig } from '@/core/config/app-config';

/**
 * Brand mark. The bank can later replace the SVG/logotype from configuration
 * without touching layout code. Uses currentColor so it adapts to theme.
 */
export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      aria-label={`${appConfig.shortName} — inicio`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glass-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight text-foreground">BDP</span>
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          Talento
        </span>
      </span>
    </Link>
  );
}
