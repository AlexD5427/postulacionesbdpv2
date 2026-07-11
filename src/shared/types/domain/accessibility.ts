/**
 * Candidate-controlled accessibility preferences. Persisted locally and applied
 * as early as possible to limit flicker. Each is independently configurable.
 */
export interface AccessibilityPreferences {
  /** Multiplier applied to root font-size (0.85 – 1.4). */
  fontScale: number;
  contrast: 'normal' | 'high';
  motion: 'system' | 'full' | 'reduced';
  transparency: 'normal' | 'reduced';
  reading: 'normal' | 'comfortable';
  highlightLinks: boolean;
  enhancedFocus: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  fontScale: 1,
  contrast: 'normal',
  motion: 'system',
  transparency: 'normal',
  reading: 'normal',
  highlightLinks: false,
  enhancedFocus: false,
};

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.4;
export const FONT_SCALE_STEP = 0.05;
