'use client';

import { useEffect } from 'react';
import { useRecentJobsStore } from '../state/recent-jobs-store';

/**
 * Records a viewed opening into the local "recently viewed" list. Rendered
 * (invisibly) by the job detail page. Kept as a tiny client island so the page
 * itself can stay a server component.
 */
export function RecentJobRecorder({
  reference,
  title,
  city,
}: {
  reference: string;
  title: string;
  city: string;
}) {
  const record = useRecentJobsStore((s) => s.record);
  useEffect(() => {
    record({ reference, title, city });
  }, [record, reference, title, city]);
  return null;
}
