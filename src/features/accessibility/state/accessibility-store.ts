'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  type AccessibilityPreferences,
} from '@/shared/types/domain';

export const A11Y_STORAGE_KEY = 'bdp.a11y.v1';

interface AccessibilityStore extends AccessibilityPreferences {
  increaseFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
  setContrast: (value: AccessibilityPreferences['contrast']) => void;
  setMotion: (value: AccessibilityPreferences['motion']) => void;
  setTransparency: (value: AccessibilityPreferences['transparency']) => void;
  setReading: (value: AccessibilityPreferences['reading']) => void;
  setHighlightLinks: (value: boolean) => void;
  setEnhancedFocus: (value: boolean) => void;
  resetAll: () => void;
}

const clampFont = (value: number) =>
  Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(value * 100) / 100));

export const useAccessibilityStore = create<AccessibilityStore>()(
  persist(
    (set) => ({
      ...DEFAULT_ACCESSIBILITY_PREFERENCES,
      increaseFont: () => set((s) => ({ fontScale: clampFont(s.fontScale + FONT_SCALE_STEP) })),
      decreaseFont: () => set((s) => ({ fontScale: clampFont(s.fontScale - FONT_SCALE_STEP) })),
      resetFont: () => set({ fontScale: 1 }),
      setContrast: (contrast) => set({ contrast }),
      setMotion: (motion) => set({ motion }),
      setTransparency: (transparency) => set({ transparency }),
      setReading: (reading) => set({ reading }),
      setHighlightLinks: (highlightLinks) => set({ highlightLinks }),
      setEnhancedFocus: (enhancedFocus) => set({ enhancedFocus }),
      resetAll: () => set({ ...DEFAULT_ACCESSIBILITY_PREFERENCES }),
    }),
    { name: A11Y_STORAGE_KEY },
  ),
);

/**
 * Reflect preferences onto <html> as data-attributes + the font-scale variable.
 * The CSS in globals.css keys off these. `motion: 'system'` defers to the OS
 * media query; 'reduced' forces reduction; 'full' opts out even if the OS
 * prefers reduced motion — but we still never auto-play essential motion.
 */
export function applyAccessibilityToDocument(prefs: AccessibilityPreferences): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.style.setProperty('--a11y-font-scale', String(prefs.fontScale));
  el.setAttribute('data-contrast', prefs.contrast);
  el.setAttribute('data-transparency', prefs.transparency);
  el.setAttribute('data-reading', prefs.reading);
  el.setAttribute('data-highlight-links', String(prefs.highlightLinks));
  el.setAttribute('data-focus', prefs.enhancedFocus ? 'enhanced' : 'normal');

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduced = prefs.motion === 'reduced' || (prefs.motion === 'system' && prefersReducedMotion);
  el.setAttribute('data-motion', reduced ? 'reduced' : 'full');
}
