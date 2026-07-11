/**
 * Assessment integrity telemetry — an ISOLATED subsystem.
 *
 * Telemetry events NEVER contain answer content, secrets or persistent device
 * fingerprints. Allowed data is limited to timing, navigation and coarse
 * connection/visibility signals. See ASSESSMENT_TELEMETRY_AND_PRIVACY.md.
 *
 * These signals are weak security context for authorised human review only —
 * never an automated rejection criterion.
 */
export type TelemetryEventType =
  | 'attempt_started'
  | 'attempt_resumed'
  | 'question_viewed'
  | 'answer_saved'
  | 'answer_changed'
  | 'section_changed'
  | 'visibility_hidden'
  | 'visibility_visible'
  | 'connection_lost'
  | 'connection_restored'
  | 'autosave_failed'
  | 'submission_started'
  | 'submission_completed';

export interface TelemetryEvent {
  eventId: string;
  attemptId: string;
  eventType: TelemetryEventType;
  clientTimestamp: string;
  /** Filled server-side; never trusted from the client. */
  serverTimestamp: string | null;
  assessmentVersion: string;
  sequenceNumber: number;
  questionId?: string;
  sectionId?: string;
  elapsedMilliseconds?: number;
  visibilityState?: 'visible' | 'hidden';
  /** Coarse category only if supplied by server (e.g. "desktop"/"mobile"). */
  clientCategory?: string;
}

export interface TelemetryBatch {
  attemptId: string;
  assessmentVersion: string;
  events: TelemetryEvent[];
}
