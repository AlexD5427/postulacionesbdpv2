'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Button — the primary interactive primitive. Variants map to the Liquid Glass
 * material and semantic colors. Always renders a real <button> (or, via
 * `asChild`, an <a>) so keyboard + screen-reader semantics are correct.
 */
export const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium',
    'transition-[transform,background-color,box-shadow,color] duration-[var(--duration-sm)] ease-[var(--ease-standard)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]',
    'active:scale-[0.98] motion-reduce:active:scale-100 select-none',
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-glass-sm hover:brightness-110 hover:shadow-glass-md',
        accent:
          'bg-accent text-accent-foreground shadow-glass-sm hover:brightness-105 hover:shadow-glass-md',
        glass:
          'glass text-foreground hover:shadow-glass-lg',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-muted',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        danger:
          'bg-danger text-white shadow-glass-sm hover:brightness-110',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto rounded-none',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-12 px-8 text-lg',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
});
