'use client';

import { passwordStrength } from '../schemas/auth-schemas';
import { cn } from '@/shared/lib/cn';

const BAR_COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];

/**
 * Transparent password strength guidance. Purely advisory — it never blocks
 * submission beyond the Zod minimum rules, and communicates via text + bars
 * (not color alone).
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < score ? BAR_COLORS[score] : 'bg-border',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Seguridad de la contraseña: {label}</p>
    </div>
  );
}
