'use client';

import { Accessibility } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/design-system/primitives/Dialog';
import { AccessibilityPanel } from './AccessibilityPanel';
import { useTranslation } from '@/features/i18n/use-translation';

/**
 * Persistent floating launcher for the accessibility control center. Fixed to
 * the viewport at a high z-index so it's reachable from anywhere, including
 * during assessments.
 */
export function AccessibilityLauncher() {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          data-tour="a11y"
          className="glass-floating fixed bottom-5 right-5 z-a11y inline-flex h-14 w-14 items-center justify-center rounded-full text-primary shadow-glass-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
          aria-label={t('a11y.open')}
        >
          <Accessibility className="h-6 w-6" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent side="right" aria-describedby="a11y-dialog-desc">
        <DialogTitle className="text-xl font-semibold">{t('a11y.title')}</DialogTitle>
        <DialogDescription id="a11y-dialog-desc" className="mb-4 mt-1 text-sm text-muted-foreground">
          {t('a11y.subtitle')}
        </DialogDescription>
        <AccessibilityPanel />
      </DialogContent>
    </Dialog>
  );
}
