'use client';

import { useEffect, useState } from 'react';
import { useAccessibilityStore } from '../state/accessibility-store';

/**
 * Resolve whether motion should be reduced, combining the OS setting with the
 * user's in-app preference. Components use this to pick static alternatives.
 */
export function useReducedMotion(): boolean {
  const motion = useAccessibilityStore((s) => s.motion);
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsReduced(mq.matches);
    const handler = (event: MediaQueryListEvent) => setOsReduced(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (motion === 'reduced') return true;
  if (motion === 'full') return false;
  return osReduced;
}
