'use client';

import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave. Calls `save` `delayMs` after the last change to `value`,
 * skipping the very first render (initial hydration). Exposes a status for a
 * subtle "Guardando…/Guardado" indicator. This is the autosave-ready
 * architecture the CV editor and application wizard build on.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  { delayMs = 1000, enabled = true }: { delayMs?: number; enabled?: boolean } = {},
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const first = useRef(true);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await save(latest.current);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delayMs]);

  return status;
}
