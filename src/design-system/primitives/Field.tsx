'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from './Label';

/**
 * Accessible form field wrapper. Wires a label, optional description and error
 * to the control via `aria-describedby`/`aria-invalid`. Pass the injected
 * `field` props to your input so the association is correct for screen readers.
 */
export interface FieldRenderProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-errormessage'?: string;
}

interface FieldProps {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
}

export function Field({ label, required, description, error, className, children }: FieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-errormessage': errorId,
      })}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
