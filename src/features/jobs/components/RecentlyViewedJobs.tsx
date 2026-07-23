'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useRecentJobsStore } from '../state/recent-jobs-store';
import { useTranslation } from '@/features/i18n/use-translation';

/**
 * A compact strip of recently-viewed openings shown atop the directory. Renders
 * nothing until the client has hydrated (the list lives in localStorage) and
 * when there is nothing to show, so it never causes layout shift or hydration
 * mismatches.
 */
export function RecentlyViewedJobs() {
  const { t } = useTranslation();
  const recent = useRecentJobsStore((s) => s.recent);
  const clear = useRecentJobsStore((s) => s.clear);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted || recent.length === 0) return null;

  return (
    <section aria-label={t('jobs.recent.title')} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Clock className="h-4 w-4" aria-hidden />
          {t('jobs.recent.title')}
        </h2>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          {t('jobs.recent.clear')}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((job) => (
          <Link
            key={job.reference}
            href={`/jobs/${job.reference}`}
            className="glass-subtle inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate max-w-[16rem]">{job.title}</span>
            <span className="text-xs text-muted-foreground">{job.reference}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
