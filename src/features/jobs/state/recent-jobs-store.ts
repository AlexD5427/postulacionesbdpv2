'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentJob {
  reference: string;
  title: string;
  city: string;
  viewedAt: number;
}

interface RecentJobsStore {
  recent: RecentJob[];
  record: (job: Omit<RecentJob, 'viewedAt'>) => void;
  clear: () => void;
}

const MAX = 6;

/**
 * "Recently viewed" openings, kept locally so a candidate can quickly return to
 * roles they were reading — a small quality-of-life feature that respects
 * privacy (never leaves the device unless a backend later opts in).
 */
export const useRecentJobsStore = create<RecentJobsStore>()(
  persist(
    (set) => ({
      recent: [],
      record: (job) =>
        set((s) => {
          const next = [
            { ...job, viewedAt: Date.now() },
            ...s.recent.filter((r) => r.reference !== job.reference),
          ].slice(0, MAX);
          return { recent: next };
        }),
      clear: () => set({ recent: [] }),
    }),
    { name: 'bdp.recent-jobs.v1' },
  ),
);
