'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DockPosition = 'bottom' | 'top';

interface UiStore {
  /** Where the floating dock lives. Bottom is the default (per the reference). */
  dockPosition: DockPosition;
  setDockPosition: (value: DockPosition) => void;
  toggleDockPosition: () => void;

  /** Whether the first-run onboarding tour has been completed/dismissed. */
  tourSeen: boolean;
  setTourSeen: (value: boolean) => void;

  /** Whether the intro preloader has played this browser session. */
  introSeen: boolean;
  setIntroSeen: (value: boolean) => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      dockPosition: 'bottom',
      setDockPosition: (dockPosition) => set({ dockPosition }),
      toggleDockPosition: () =>
        set((s) => ({ dockPosition: s.dockPosition === 'bottom' ? 'top' : 'bottom' })),
      tourSeen: false,
      setTourSeen: (tourSeen) => set({ tourSeen }),
      introSeen: false,
      setIntroSeen: (introSeen) => set({ introSeen }),
    }),
    {
      name: 'bdp.ui.v1',
      // introSeen is session-scoped in practice; we still persist it but the
      // Preloader also checks sessionStorage so it replays once per session.
      partialize: (s) => ({ dockPosition: s.dockPosition, tourSeen: s.tourSeen }),
    },
  ),
);

/** Lightweight event bus for the command palette (open/close/toggle). */
type PaletteListener = (open: boolean) => void;
const paletteListeners = new Set<PaletteListener>();
let paletteOpen = false;

export function setCommandPalette(open: boolean) {
  paletteOpen = open;
  paletteListeners.forEach((l) => l(open));
}
export function toggleCommandPalette() {
  setCommandPalette(!paletteOpen);
}
export function subscribeCommandPalette(listener: PaletteListener) {
  paletteListeners.add(listener);
  return () => paletteListeners.delete(listener);
}
