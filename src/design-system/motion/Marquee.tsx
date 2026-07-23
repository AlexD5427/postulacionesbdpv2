'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * An infinite horizontal marquee. The track is duplicated so the CSS animation
 * (translateX -50%) loops seamlessly. Pauses on hover and freezes entirely under
 * reduced motion (handled in globals.css). Purely decorative content should be
 * marked aria-hidden by the caller.
 */
export function Marquee({
  children,
  reverse = false,
  durationSeconds = 42,
  className,
}: {
  children: ReactNode;
  reverse?: boolean;
  durationSeconds?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('marquee', reverse && 'marquee--reverse', className)}
      style={{ ['--marquee-duration' as string]: `${durationSeconds}s` }}
    >
      <div className="marquee__track" aria-hidden={false}>
        {children}
      </div>
      <div className="marquee__track" aria-hidden>
        {children}
      </div>
    </div>
  );
}
