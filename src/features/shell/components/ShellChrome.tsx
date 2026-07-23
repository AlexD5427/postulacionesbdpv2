'use client';

import { Preloader } from './Preloader';
import { ScrollProgress } from './ScrollProgress';
import { BackToTop } from './BackToTop';
import { CommandPalette } from './CommandPalette';
import { OnboardingTour } from './OnboardingTour';
import { Dock } from './Dock';
import { ReadingRuler } from '@/features/accessibility/components/ReadingRuler';

/**
 * All the global, always-mounted UI chrome for the app shell, grouped so the
 * root layout stays declarative:
 *  - Preloader (first-load brand intro)
 *  - ScrollProgress (top gradient bar)
 *  - Dock (primary floating navigation)
 *  - CommandPalette (⌘K quick search)
 *  - BackToTop, ReadingRuler, OnboardingTour
 */
export function ShellChrome() {
  return (
    <>
      <Preloader />
      <ScrollProgress />
      <Dock />
      <CommandPalette />
      <BackToTop />
      <ReadingRuler />
      <OnboardingTour />
    </>
  );
}
