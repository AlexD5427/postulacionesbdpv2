import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** Consistent page title block for content/candidate pages. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
