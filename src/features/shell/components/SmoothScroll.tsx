'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { useAccessibilityStore } from '@/features/accessibility/state/accessibility-store';

/**
 * Global smooth-scroll powered by Lenis for a buttery, iOS-flavoured feel.
 *
 * Accessibility first: if the candidate (or their OS) prefers reduced motion we
 * do NOT hijack scrolling — native scrolling stays intact. We also expose the
 * instance on `window.__lenis` so the back-to-top button and in-page anchors can
 * animate through the same engine.
 */
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function SmoothScroll() {
  const motion = useAccessibilityStore((s) => s.motion);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reduced = motion === 'reduced' || (motion === 'system' && prefersReduced);
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    window.__lenis = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, [motion]);

  return null;
}
