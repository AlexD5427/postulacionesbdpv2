'use client';

import { useEffect, useState } from 'react';

/**
 * Countdown to an ISO deadline. Returns remaining milliseconds (never below 0)
 * and a formatted mm:ss string. Ticks once per second; pauses cleanly on
 * unmount. When there is no deadline, returns null (untimed).
 */
export function useCountdown(deadlineIso: string | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineIso) {
      setRemaining(null);
      return;
    }
    const deadline = new Date(deadlineIso).getTime();
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadlineIso]);

  const formatted =
    remaining === null
      ? null
      : `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(
          Math.floor((remaining % 60000) / 1000),
        ).padStart(2, '0')}`;

  return { remaining, formatted, expired: remaining !== null && remaining <= 0 };
}
