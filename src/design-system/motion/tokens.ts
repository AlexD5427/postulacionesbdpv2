import type { Transition, Variants } from 'framer-motion';

/**
 * Motion Design Language tokens (durations, springs, variants) that mirror the
 * CSS motion tokens. Centralising them keeps animation consistent and makes it
 * trivial to tune globally. See DESIGN_SYSTEM.md §Motion.
 */
export const springs = {
  soft: { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 } as Transition,
  snappy: { type: 'spring', stiffness: 380, damping: 30 } as Transition,
} as const;

export const durations = {
  xs: 0.12,
  sm: 0.18,
  md: 0.26,
  lg: 0.42,
} as const;

/** Reveal-on-scroll variants (fade + rise). */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.lg, ease: [0.2, 0, 0, 1] } },
};

/** Staggered container for lists/grids. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
