'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';

/**
 * Thin brand-gradient progress bar pinned to the top of the viewport that fills
 * as the page scrolls. Purely decorative (aria-hidden). Uses a spring for a soft
 * follow, flattened under reduced motion.
 */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: reduced ? 1000 : 140,
    damping: reduced ? 100 : 24,
    restDelta: 0.001,
  });

  return <motion.div className="scroll-progress w-full" aria-hidden style={{ scaleX }} />;
}
