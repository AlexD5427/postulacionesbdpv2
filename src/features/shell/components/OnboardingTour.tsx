'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../state/ui-store';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import { useTranslation } from '@/features/i18n/use-translation';
import type { TranslationKey } from '@/features/i18n/dictionary';
import { Button } from '@/design-system/primitives/Button';

type Step = { selector: string; titleKey: TranslationKey; bodyKey: TranslationKey };

const STEPS: Step[] = [
  { selector: '[data-tour="dock"]', titleKey: 'tour.dock.title', bodyKey: 'tour.dock.body' },
  { selector: '[data-tour="lang"]', titleKey: 'tour.lang.title', bodyKey: 'tour.lang.body' },
  { selector: '[data-tour="a11y"]', titleKey: 'tour.a11y.title', bodyKey: 'tour.a11y.body' },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A gentle first-run onboarding: a spotlight dims the page and highlights the
 * dock, the language switcher and the accessibility launcher in turn. Runs once
 * (persisted via ui-store) and is fully skippable. Under reduced motion the
 * spotlight simply appears without the animated transitions.
 */
export function OnboardingTour() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const tourSeen = useUiStore((s) => s.tourSeen);
  const setTourSeen = useUiStore((s) => s.setTourSeen);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  // Start after the preloader has cleared, and only on the landing page for
  // pointer users on wider screens (where the coach-mark targets are present).
  useEffect(() => {
    if (tourSeen || pathname !== '/') return;
    const start = window.setTimeout(() => {
      if (window.matchMedia('(min-width: 768px)').matches) setActive(true);
    }, 2800);
    return () => window.clearTimeout(start);
  }, [tourSeen, pathname]);

  const measure = useCallback(() => {
    const step = STEPS[index];
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [index]);

  useEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [active, measure]);

  const finish = useCallback(() => {
    setActive(false);
    setTourSeen(true);
  }, [setTourSeen]);

  if (!active) return null;

  const step = STEPS[index];
  if (!step) return null;

  const pad = 10;
  const spot = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Place the tooltip: above the target if it sits in the lower half, else below.
  const belowTarget = spot ? spot.top < window.innerHeight / 2 : true;
  const tooltipTop = spot
    ? belowTarget
      ? spot.top + spot.height + 14
      : Math.max(16, spot.top - 168)
    : window.innerHeight / 2;
  const tooltipLeft = spot
    ? Math.min(Math.max(16, spot.left + spot.width / 2 - 160), window.innerWidth - 336)
    : window.innerWidth / 2 - 160;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Dimmer with a spotlight hole via a huge box-shadow ring. */}
        <button
          type="button"
          aria-label={t('tour.skip')}
          onClick={finish}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        {spot && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute rounded-3xl"
            initial={false}
            animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
            transition={
              reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }
            }
            style={{
              boxShadow: '0 0 0 100vmax rgba(6, 20, 40, 0.62)',
              outline: '2px solid rgb(var(--color-secondary))',
            }}
          />
        )}

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t(step.titleKey)}
          className="glass-modal absolute w-[20rem] max-w-[calc(100vw-2rem)] rounded-3xl p-5 shadow-glass-xl"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, top: tooltipTop, left: tooltipLeft }}
          transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 280, damping: 28 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {index + 1} {t('tour.step')} {STEPS.length}
          </p>
          <h2 className="mt-1 text-lg font-bold">{t(step.titleKey)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(step.bodyKey)}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('tour.skip')}
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="outline" size="sm" onClick={() => setIndex((i) => i - 1)}>
                  {t('tour.prev')}
                </Button>
              )}
              {index < STEPS.length - 1 ? (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                  {t('tour.next')}
                </Button>
              ) : (
                <Button size="sm" onClick={finish}>
                  {t('tour.done')}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
