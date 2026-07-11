'use client';

import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useAccessibilityStore } from '../state/accessibility-store';
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from '@/shared/types/domain';
import { Button } from '@/design-system/primitives/Button';
import { Switch } from '@/design-system/primitives/Switch';
import { ThemeToggle } from '@/design-system/themes/ThemeToggle';
import { cn } from '@/shared/lib/cn';

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <span id={descId} className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={descId} />
    </div>
  );
}

/**
 * The accessibility control center. Every preference is independently
 * configurable, persists locally (Zustand persist) and applies via <html>
 * data-attributes. A single "Restaurar" button resets everything.
 */
export function AccessibilityPanel({ className }: { className?: string }) {
  const s = useAccessibilityStore();
  const fontPercent = Math.round(s.fontScale * 100);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <section aria-labelledby="a11y-text">
        <h3 id="a11y-text" className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tamaño del texto
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={s.decreaseFont}
            disabled={s.fontScale <= FONT_SCALE_MIN}
            aria-label="Reducir tamaño del texto"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
          <span className="flex-1 text-center text-sm tabular-nums" aria-live="polite">
            {fontPercent}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={s.increaseFont}
            disabled={s.fontScale >= FONT_SCALE_MAX}
            aria-label="Aumentar tamaño del texto"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={s.resetFont} aria-label="Restaurar tamaño del texto">
            <RotateCcw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </section>

      <section aria-labelledby="a11y-theme">
        <h3 id="a11y-theme" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tema
        </h3>
        <ThemeToggle />
      </section>

      <section aria-labelledby="a11y-toggles" className="divide-y divide-border">
        <h3 id="a11y-toggles" className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preferencias
        </h3>
        <ToggleRow
          id="a11y-contrast"
          label="Alto contraste"
          description="Aumenta el contraste de texto y bordes."
          checked={s.contrast === 'high'}
          onChange={(v) => s.setContrast(v ? 'high' : 'normal')}
        />
        <ToggleRow
          id="a11y-motion"
          label="Reducir movimiento"
          description="Minimiza animaciones y transiciones."
          checked={s.motion === 'reduced'}
          onChange={(v) => s.setMotion(v ? 'reduced' : 'system')}
        />
        <ToggleRow
          id="a11y-transparency"
          label="Reducir transparencia"
          description="Vuelve opacas las superficies de vidrio."
          checked={s.transparency === 'reduced'}
          onChange={(v) => s.setTransparency(v ? 'reduced' : 'normal')}
        />
        <ToggleRow
          id="a11y-reading"
          label="Modo lectura cómoda"
          description="Mayor interlineado y ancho de línea limitado."
          checked={s.reading === 'comfortable'}
          onChange={(v) => s.setReading(v ? 'comfortable' : 'normal')}
        />
        <ToggleRow
          id="a11y-links"
          label="Resaltar enlaces y botones"
          checked={s.highlightLinks}
          onChange={s.setHighlightLinks}
        />
        <ToggleRow
          id="a11y-focus"
          label="Foco reforzado"
          description="Indicador de foco más visible al navegar con teclado."
          checked={s.enhancedFocus}
          onChange={s.setEnhancedFocus}
        />
      </section>

      <Button variant="outline" onClick={s.resetAll} className="mt-1 w-full">
        <RotateCcw className="h-4 w-4" aria-hidden />
        Restaurar valores predeterminados
      </Button>
    </div>
  );
}
