'use client';

import { useEffect, useState } from 'react';
import { useAccessibilityStore } from '../state/accessibility-store';

/**
 * A horizontal reading guide that tracks the pointer's vertical position, so
 * readers can keep their place on long pages. Only mounts its listeners when the
 * candidate enables it in the accessibility center. Pointer-events are off, so
 * it never blocks interaction.
 */
export function ReadingRuler() {
  const enabled = useAccessibilityStore((s) => s.readingRuler);
  const [y, setY] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    setY(window.innerHeight / 2);
    const onMove = (event: PointerEvent) => setY(event.clientY);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  if (!enabled) return null;
  return <div className="reading-ruler" aria-hidden style={{ ['--ruler-y' as string]: `${y}px` }} />;
}
