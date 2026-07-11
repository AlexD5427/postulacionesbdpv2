import type { ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const TONE = {
  info: { icon: Info, cls: 'border-info/30 bg-info/10 text-foreground', iconCls: 'text-info' },
  success: { icon: CheckCircle2, cls: 'border-success/30 bg-success/10 text-foreground', iconCls: 'text-success' },
  warning: { icon: AlertTriangle, cls: 'border-warning/30 bg-warning/10 text-foreground', iconCls: 'text-warning' },
  danger: { icon: XCircle, cls: 'border-danger/30 bg-danger/10 text-foreground', iconCls: 'text-danger' },
} as const;

/**
 * Inline alert/feedback. Errors use role="alert" (assertive); other tones use
 * role="status" (polite) so async feedback is announced accessibly.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONE;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls, iconCls } = TONE[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-xl border p-3 text-sm', cls, className)}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconCls)} aria-hidden />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
