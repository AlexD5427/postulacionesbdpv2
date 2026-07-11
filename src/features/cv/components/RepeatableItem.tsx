'use client';

import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';

/**
 * Wrapper for a repeatable CV entry with accessible reorder + remove controls.
 * Reordering uses buttons (never drag-only) to satisfy WCAG 2.5.7.
 */
export function RepeatableItem({
  title,
  index,
  count,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <GlassSurface variant="subtle" radius="2xl" padding="md" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {title} {index + 1}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={index === 0} aria-label={`Mover ${title} ${index + 1} hacia arriba`}>
            <ChevronUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === count - 1}
            aria-label={`Mover ${title} ${index + 1} hacia abajo`}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Eliminar ${title} ${index + 1}`}>
            <Trash2 className="h-4 w-4 text-danger" aria-hidden />
          </Button>
        </div>
      </div>
      {children}
    </GlassSurface>
  );
}
