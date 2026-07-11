'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedJobsStore {
  saved: string[]; // job references
  toggle: (reference: string) => void;
  isSaved: (reference: string) => boolean;
}

/**
 * Locally-saved jobs (guest-friendly). When a candidate has an account this can
 * later sync to the backend; the local list acts as an offline cache.
 */
export const useSavedJobsStore = create<SavedJobsStore>()(
  persist(
    (set, get) => ({
      saved: [],
      toggle: (reference) =>
        set((s) => ({
          saved: s.saved.includes(reference)
            ? s.saved.filter((r) => r !== reference)
            : [...s.saved, reference],
        })),
      isSaved: (reference) => get().saved.includes(reference),
    }),
    { name: 'bdp.saved-jobs.v1' },
  ),
);
