import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyAccessibilityToDocument,
  useAccessibilityStore,
} from './accessibility-store';
import { DEFAULT_ACCESSIBILITY_PREFERENCES, FONT_SCALE_MAX, FONT_SCALE_MIN } from '@/shared/types/domain';

describe('accessibility store', () => {
  beforeEach(() => {
    useAccessibilityStore.getState().resetAll();
  });

  it('clamps font scale within bounds', () => {
    const store = useAccessibilityStore.getState();
    for (let i = 0; i < 50; i += 1) store.increaseFont();
    expect(useAccessibilityStore.getState().fontScale).toBeLessThanOrEqual(FONT_SCALE_MAX);
    for (let i = 0; i < 50; i += 1) useAccessibilityStore.getState().decreaseFont();
    expect(useAccessibilityStore.getState().fontScale).toBeGreaterThanOrEqual(FONT_SCALE_MIN);
  });

  it('toggles independent preferences', () => {
    useAccessibilityStore.getState().setContrast('high');
    useAccessibilityStore.getState().setTransparency('reduced');
    expect(useAccessibilityStore.getState().contrast).toBe('high');
    expect(useAccessibilityStore.getState().transparency).toBe('reduced');
  });

  it('resets to defaults', () => {
    useAccessibilityStore.getState().setEnhancedFocus(true);
    useAccessibilityStore.getState().resetAll();
    expect(useAccessibilityStore.getState().enhancedFocus).toBe(DEFAULT_ACCESSIBILITY_PREFERENCES.enhancedFocus);
  });
});

describe('applyAccessibilityToDocument', () => {
  it('reflects preferences onto <html> data-attributes + font scale', () => {
    applyAccessibilityToDocument({
      ...DEFAULT_ACCESSIBILITY_PREFERENCES,
      fontScale: 1.2,
      contrast: 'high',
      transparency: 'reduced',
      reading: 'comfortable',
      motion: 'reduced',
      highlightLinks: true,
      enhancedFocus: true,
    });
    const el = document.documentElement;
    expect(el.getAttribute('data-contrast')).toBe('high');
    expect(el.getAttribute('data-transparency')).toBe('reduced');
    expect(el.getAttribute('data-reading')).toBe('comfortable');
    expect(el.getAttribute('data-motion')).toBe('reduced');
    expect(el.getAttribute('data-focus')).toBe('enhanced');
    expect(el.getAttribute('data-highlight-links')).toBe('true');
    expect(el.style.getPropertyValue('--a11y-font-scale')).toBe('1.2');
  });
});
