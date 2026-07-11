'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { revealVariants, staggerContainer } from './tokens';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';

/**
 * Reveal-on-scroll wrapper. When reduced motion is active it renders content
 * statically (no transform/opacity animation) so no information depends on
 * motion. Uses IntersectionObserver via framer-motion's `whileInView`.
 */
export function Reveal({
  children,
  className,
  as = 'div',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Staggered container to animate children in sequence. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={revealVariants}>
      {children}
    </motion.div>
  );
}
