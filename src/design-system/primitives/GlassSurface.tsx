import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

/**
 * GlassSurface — the base container that renders one of the Liquid Glass
 * material variants. Prefer this over ad-hoc `.glass*` class usage so the
 * material stays consistent and its accessibility fallbacks apply everywhere.
 */
const glassVariants = cva('', {
  variants: {
    variant: {
      subtle: 'glass-subtle',
      standard: 'glass',
      elevated: 'glass-elevated',
      floating: 'glass-floating',
      navigation: 'glass-navigation',
      modal: 'glass-modal',
      media: 'glass-media',
    },
    radius: {
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: { variant: 'standard', radius: '2xl', padding: 'md' },
});

export interface GlassSurfaceProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassVariants> {}

export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(function GlassSurface(
  { className, variant, radius, padding, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn(glassVariants({ variant, radius, padding }), className)} {...props} />
  );
});
