import type {
  AssessmentAttempt,
  CandidateAccount,
  CandidateProfile,
  CoverLetter,
  DigitalCV,
  JobApplication,
  Notification,
  NotificationPreferences,
} from '@/shared/types/domain';
import type { AuthSession } from '@/core/auth/types';

/**
 * In-memory + localStorage-backed store for the MOCK provider.
 *
 * On the server (no `window`) it degrades to a per-process memory object, which
 * is exactly what we want for read-only job/assessment seed data during SSR.
 * Candidate-scoped writes happen client-side and persist to localStorage so a
 * demo survives page reloads. Nothing here is a real backend.
 */
export interface MockState {
  session: AuthSession | null;
  account: CandidateAccount | null;
  profile: CandidateProfile | null;
  cv: DigitalCV | null;
  coverLetters: CoverLetter[];
  applications: JobApplication[];
  attempts: Record<string, AssessmentAttempt>;
  notifications: Notification[];
  notificationPrefs: NotificationPreferences | null;
}

const STORAGE_KEY = 'bdp.mock.v1';

const emptyState: MockState = {
  session: null,
  account: null,
  profile: null,
  cv: null,
  coverLetters: [],
  applications: [],
  attempts: {},
  notifications: [],
  notificationPrefs: null,
};

let memoryState: MockState = structuredClone(emptyState);

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadState(): MockState {
  if (!isBrowser()) return memoryState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(emptyState);
    return { ...structuredClone(emptyState), ...(JSON.parse(raw) as Partial<MockState>) };
  } catch {
    return structuredClone(emptyState);
  }
}

export function saveState(state: MockState): void {
  if (!isBrowser()) {
    memoryState = state;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked; fall back to memory silently.
    memoryState = state;
  }
}

export function mutateState(mutator: (state: MockState) => void): MockState {
  const state = loadState();
  mutator(state);
  saveState(state);
  return state;
}

export function resetState(): void {
  memoryState = structuredClone(emptyState);
  if (isBrowser()) window.localStorage.removeItem(STORAGE_KEY);
}

/** Simulate small network latency in the browser; instant on server/tests. */
export async function delay(ms = 140): Promise<void> {
  if (!isBrowser() || process.env.NODE_ENV === 'test') return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
