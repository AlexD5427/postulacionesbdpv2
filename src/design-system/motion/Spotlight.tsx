'use client';

import { useRef, type ReactNode, type PointerEvent } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Wraps content in a surface that shows a soft brand-cyan glow following the
 * pointer (the `.spotlight` material in globals.css sets the visuals; here we
 * only feed it CSS variables). No React re-renders per move — we mutate style
 * directly. The glow is disabled under reduced transparency via CSS.
 */
export function Spotlight({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section';
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }

  const Component = Tag as 'div';
  return (
    <Component ref={ref} onPointerMove={onMove} className={cn('spotlight', className)}>
      {children}
    </Component>
  );
}
