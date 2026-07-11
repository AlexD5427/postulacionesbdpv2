'use client';

import { cn } from '@/shared/lib/cn';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Accessible multi-select rendered as toggle chips. Each chip is a real toggle
 * button (aria-pressed); selection is not conveyed by color alone (a check-like
 * filled state + text). Keyboard operable.
 */
export function ChipMultiSelect<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ChipOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  label?: string;
}) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            {active ? '✓ ' : ''}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
