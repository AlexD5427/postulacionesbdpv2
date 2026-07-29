'use client';

import { z } from 'zod';
import { logger } from '@/core/observability/logger';
import type { AnswerMap } from '../model/answers';

/**
 * Minimal reload safety for an in-progress public attempt.
 *
 * The backend stores no partial progress (`PORTAL_CANDIDATES_HANDOFF.md §7`), so
 * an accidental reload in the middle of a 30-minute assessment would otherwise
 * lose everything *and* leave an abandoned `in_progress` row behind when the
 * candidate starts over.
 *
 * Deliberate limits:
 *
 *  · **`sessionStorage`, not `localStorage`** — the draft dies with the tab.
 *  · **No personal data.** The name and the document are never written. On
 *    resume the candidate types them again; the attempt row already holds the
 *    values captured at `startAttempt`.
 *  · **No answer text in logs**, ever. Failures are logged as a code only.
 *  · **Version-fenced.** A draft is only restored for the same `publicCode` and
 *    the same `assessmentVersion`; if the ATS published a new version the draft
 *    is discarded rather than replayed against different questions.
 *  · **Single `submitRequestId`.** It is created once and persisted, so a retry
 *    after a reload still reuses the same id and cannot duplicate the attempt.
 */

const STORAGE_PREFIX = 'bdp.eval.beta.draft.v1';
/** Drafts older than this are ignored (a stale tab is not a resumable attempt). */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const answerValueSchema: z.ZodType<AnswerMap[string]> = z.union([
  z.string(),
  z.number(),
  z.array(z.string()),
  z.record(z.string(), z.string()),
  z.null(),
]);

const draftSchema = z.object({
  publicCode: z.string().min(1),
  assessmentVersion: z.number(),
  attemptId: z.string().min(1),
  startedAt: z.string().min(1),
  submitRequestId: z.string().min(1),
  answers: z.record(z.string(), answerValueSchema),
  savedAt: z.string().min(1),
});

export type AttemptDraft = z.infer<typeof draftSchema>;

function storageKey(publicCode: string): string {
  return `${STORAGE_PREFIX}.${publicCode}`;
}

function session(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // Private-mode browsers can throw on access. Losing the draft is acceptable;
    // breaking the assessment is not.
    return null;
  }
}

export function saveDraft(draft: Omit<AttemptDraft, 'savedAt'>): void {
  const store = session();
  if (!store) return;
  try {
    store.setItem(
      storageKey(draft.publicCode),
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
  } catch {
    logger.warn('evaluations: no se pudo guardar el borrador local');
  }
}

/** Restore a draft for this code and version, or `null`. */
export function loadDraft(publicCode: string, assessmentVersion: number): AttemptDraft | null {
  const store = session();
  if (!store) return null;
  const raw = store.getItem(storageKey(publicCode));
  if (!raw) return null;

  let parsed: AttemptDraft;
  try {
    const candidate = draftSchema.safeParse(JSON.parse(raw));
    if (!candidate.success) throw new Error('shape');
    parsed = candidate.data;
  } catch {
    clearDraft(publicCode);
    return null;
  }

  const expired = Date.now() - new Date(parsed.savedAt).getTime() > MAX_AGE_MS;
  if (parsed.publicCode !== publicCode || parsed.assessmentVersion !== assessmentVersion || expired) {
    // A newer published version (or a stale tab) invalidates the draft. Never
    // replay old answers against different questions.
    clearDraft(publicCode);
    return null;
  }
  return parsed;
}

export function clearDraft(publicCode: string): void {
  const store = session();
  if (!store) return;
  try {
    store.removeItem(storageKey(publicCode));
  } catch {
    /* nothing to do */
  }
}
