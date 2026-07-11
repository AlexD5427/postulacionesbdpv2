import { describe, expect, it, vi } from 'vitest';
import { AssessmentTelemetry } from './telemetry-controller';
import type { TelemetryBatch } from '@/shared/types/domain';

describe('AssessmentTelemetry', () => {
  it('never includes answer content — only allow-listed fields survive', () => {
    const batches: TelemetryBatch[] = [];
    const telemetry = new AssessmentTelemetry('attempt-1', '1.0.0', async (b) => {
      batches.push(b);
      return { accepted: b.events.length };
    });

    telemetry.record('answer_changed', {
      questionId: 'q1',
      sectionId: 's1',
      // Attempt to smuggle disallowed data:
      ...({ value: 'LA RESPUESTA SECRETA', answer: 'x', ipAddress: '1.2.3.4' } as Record<string, unknown>),
    });

    // Flush and inspect the recorded event.
    return telemetry.flush().then(() => {
      const event = batches[0]?.events[0];
      expect(event?.eventType).toBe('answer_changed');
      expect(event?.questionId).toBe('q1');
      expect(event?.sectionId).toBe('s1');
      expect((event as unknown as Record<string, unknown>).value).toBeUndefined();
      expect((event as unknown as Record<string, unknown>).answer).toBeUndefined();
      expect((event as unknown as Record<string, unknown>).ipAddress).toBeUndefined();
    });
  });

  it('assigns monotonically increasing sequence numbers', async () => {
    const events: number[] = [];
    const telemetry = new AssessmentTelemetry('a', '1', async (b) => {
      b.events.forEach((e) => events.push(e.sequenceNumber));
      return { accepted: b.events.length };
    });
    telemetry.record('attempt_started');
    telemetry.record('question_viewed', { questionId: 'q' });
    telemetry.record('answer_saved');
    await telemetry.flush();
    expect(events).toEqual([0, 1, 2]);
  });

  it('re-queues events when the sink fails (best-effort, no loss)', async () => {
    const sink = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ accepted: 1 });
    const telemetry = new AssessmentTelemetry('a', '1', sink);
    telemetry.record('attempt_started');
    await telemetry.flush(); // fails -> re-queued
    expect(telemetry.pendingCount()).toBe(1);
    await telemetry.flush(); // succeeds
    expect(telemetry.pendingCount()).toBe(0);
    expect(sink).toHaveBeenCalledTimes(2);
  });
});
