'use client';

import { PanelBottom, PanelTop } from 'lucide-react';
import { useUiStore, type DockPosition } from '../state/ui-store';
import { useTranslation } from '@/features/i18n/use-translation';
import { cn } from '@/shared/lib/cn';

/**
 * Segmented control to move the floating dock between the bottom (default) and
 * the top of the viewport — the setting the reference-inspired dock exposes.
 */
export function DockPositionControl() {
  const { t } = useTranslation();
  const position = useUiStore((s) => s.dockPosition);
  const setDockPosition = useUiStore((s) => s.setDockPosition);

  const options: Array<{ value: DockPosition; label: string; icon: typeof PanelBottom }> = [
    { value: 'bottom', label: t('dock.position.bottom'), icon: PanelBottom },
    { value: 'top', label: t('dock.position.top'), icon: PanelTop },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{t('dock.position.label')}</span>
      <div role="group" aria-label={t('dock.position.label')} className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = position === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDockPosition(opt.value)}
              aria-pressed={active}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary text-primary-foreground shadow-glass-sm'
                  : 'glass-subtle text-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
