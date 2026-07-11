import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Accessible spinner with an sr-only label and a live region role. */
export function Spinner({ label = 'Cargando…', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-muted-foreground', className)}>
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
