/**
 * Candidate-controlled accessibility preferences. Persisted locally and applied
 * as early as possible to limit flicker. Each is independently configurable.
 */
export type ColorVisionMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilityPreferences {
  /** Multiplier applied to root font-size (0.85 – 1.4). */
  fontScale: number;
  contrast: 'normal' | 'high';
  motion: 'system' | 'full' | 'reduced';
  transparency: 'normal' | 'reduced';
  reading: 'normal' | 'comfortable';
  highlightLinks: boolean;
  enhancedFocus: boolean;
  /** Colour-vision assistance filter (feColorMatrix applied at <html>). */
  colorVision: ColorVisionMode;
  /** Switches body text to a more legible humanist stack + extra spacing. */
  readingFont: 'default' | 'legible';
  /** Horizontal reading guide band that follows the pointer. */
  readingRuler: boolean;
  /** Enlarged custom pointer. */
  largeCursor: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  fontScale: 1,
  contrast: 'normal',
  motion: 'system',
  transparency: 'normal',
  reading: 'normal',
  highlightLinks: false,
  enhancedFocus: false,
  colorVision: 'none',
  readingFont: 'default',
  readingRuler: false,
  largeCursor: false,
};

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.4;
export const FONT_SCALE_STEP = 0.05;
