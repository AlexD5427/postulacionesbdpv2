import type { TelemetryBatch, TelemetryEvent, TelemetryEventType } from '@/shared/types/domain';
import { uuid } from '@/shared/utils/ids';

/**
 * Assessment integrity telemetry controller.
 *
 * DESIGN CONSTRAINTS (see ASSESSMENT_TELEMETRY_AND_PRIVACY.md):
 *  - NEVER contains answer content, secrets, or persistent fingerprints.
 *  - Events are batched (interval + size threshold) rather than one request per
 *    event.
 *  - Bounded in-memory queue; if offline or the sink fails, events are re-queued
 *    up to MAX_QUEUE and the OLDEST are dropped beyond that (no unbounded
 *    storage growth).
 *  - Best-effort: telemetry failures must never block assessment submission.
 *
 * A whitelist of extra fields is enforced so no answer value can leak in.
 */
export type TelemetrySink = (batch: TelemetryBatch) => Promise<{ accepted: number }>;

const MAX_QUEUE = 200;
const FLUSH_THRESHOLD = 15;
const ALLOWED_EXTRA_KEYS = new Set<keyof TelemetryEvent>([
  'questionId',
  'sectionId',
  'elapsedMilliseconds',
  'visibilityState',
  'clientCategory',
]);

export interface RecordOptions {
  questionId?: string;
  sectionId?: string;
  elapsedMilliseconds?: number;
  visibilityState?: 'visible' | 'hidden';
  clientCategory?: string;
}

export class AssessmentTelemetry {
  private queue: TelemetryEvent[] = [];
  private sequence = 0;
  private flushing = false;

  constructor(
    private readonly attemptId: string,
    private readonly assessmentVersion: string,
    private readonly sink: TelemetrySink,
  ) {}

  /** Record an event. Extra fields are filtered against the allow-list. */
  record(eventType: TelemetryEventType, options: RecordOptions = {}): void {
    const safeExtra: RecordOptions = {};
    for (const key of Object.keys(options) as (keyof RecordOptions)[]) {
      if (ALLOWED_EXTRA_KEYS.has(key as keyof TelemetryEvent)) {
        // @ts-expect-error index write across narrowed union is safe here
        safeExtra[key] = options[key];
      }
    }

    const event: TelemetryEvent = {
      eventId: uuid(),
      attemptId: this.attemptId,
      eventType,
      clientTimestamp: new Date().toISOString(),
      serverTimestamp: null,
      assessmentVersion: this.assessmentVersion,
      sequenceNumber: this.sequence++,
      ...safeExtra,
    };

    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE) {
      // Drop the oldest to keep the queue bounded.
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
    }
    if (this.queue.length >= FLUSH_THRESHOLD) void this.flush();
  }

  /** Best-effort flush. Re-queues on failure; never throws. */
  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    this.flushing = true;
    const events = this.queue.splice(0, this.queue.length);
    try {
      await this.sink({ attemptId: this.attemptId, assessmentVersion: this.assessmentVersion, events });
    } catch {
      // Re-queue (bounded) and try again later.
      this.queue = [...events, ...this.queue].slice(-MAX_QUEUE);
    } finally {
      this.flushing = false;
    }
  }

  pendingCount(): number {
    return this.queue.length;
  }
}
