'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const baseField = cn(
  'glass-input w-full rounded-md border border-border px-4 py-2.5 text-base text-foreground',
  'placeholder:text-muted-foreground',
  'transition-shadow duration-[var(--duration-sm)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)]',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/40',
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return <input ref={ref} type={type} className={cn(baseField, className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(baseField, 'resize-y', className)} {...props} />;
  },
);
