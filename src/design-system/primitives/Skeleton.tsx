import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** Loading placeholder. Marked aria-hidden; announce loading via a live region. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} {...props} />;
}
