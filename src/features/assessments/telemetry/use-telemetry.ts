'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { TelemetryEventType } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { featureFlags } from '@/core/config/feature-flags';
import { AssessmentTelemetry, type RecordOptions } from './telemetry-controller';

/**
 * React binding for the telemetry controller.
 *
 * Wires page-visibility + online/offline listeners and a periodic flush. All
 * listeners are cleaned up on unmount, and a final flush is attempted. Returns
 * a stable `record` function. When the telemetry flag is off, `record` is a
 * no-op so the runner code path is identical.
 */
export function useAssessmentTelemetry(attemptId: string | undefined, assessmentVersion: string) {
  const enabled = featureFlags.assessmentTelemetry && Boolean(attemptId);
  const controllerRef = useRef<AssessmentTelemetry | null>(null);

  const controller = useMemo(() => {
    if (!enabled || !attemptId) return null;
    const provider = getDataProvider();
    return new AssessmentTelemetry(attemptId, assessmentVersion, (batch) =>
      provider.telemetry.sendBatch(batch),
    );
  }, [enabled, attemptId, assessmentVersion]);
  controllerRef.current = controller;

  useEffect(() => {
    if (!controller) return;

    const onVisibility = () => {
      controller.record(document.hidden ? 'visibility_hidden' : 'visibility_visible', {
        visibilityState: document.hidden ? 'hidden' : 'visible',
      });
      if (document.hidden) void controller.flush();
    };
    const onOnline = () => {
      controller.record('connection_restored');
      void controller.flush();
    };
    const onOffline = () => controller.record('connection_lost');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = window.setInterval(() => void controller.flush(), 8000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
      void controller.flush();
    };
  }, [controller]);

  function record(eventType: TelemetryEventType, options?: RecordOptions) {
    controllerRef.current?.record(eventType, options);
  }

  return { record, flush: () => controllerRef.current?.flush() ?? Promise.resolve() };
}
