'use client';

import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Accessible horizontal stepper. Communicates progress via text + aria-current. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Progreso de la postulación">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium',
                state === 'current' && 'border-primary bg-primary/10 text-primary',
                state === 'done' && 'border-success/40 bg-success/10 text-success',
                state === 'upcoming' && 'border-border text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full text-xs',
                  state === 'done' ? 'bg-success text-white' : state === 'current' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {state === 'done' ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
