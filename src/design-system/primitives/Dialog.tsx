'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Dialog built on Radix — provides focus trapping, focus restoration, ESC to
 * close and an accessible name/description out of the box.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'center' | 'right' }
>(function DialogContent({ className, children, side = 'center', ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-overlay bg-slate-950/40 backdrop-blur-sm',
          'data-[state=open]:animate-fade-in motion-reduce:animate-none',
        )}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'glass-modal fixed z-modal overflow-y-auto text-foreground shadow-glass-xl focus:outline-none',
          side === 'center' &&
            'left-1/2 top-1/2 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6',
          side === 'right' &&
            'right-0 top-0 h-dvh w-[min(26rem,100vw)] rounded-l-3xl p-6',
          'data-[state=open]:animate-fade-in motion-reduce:animate-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
