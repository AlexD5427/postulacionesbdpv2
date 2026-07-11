'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/design-system/primitives/Button';
import { useSavedJobsStore } from '../state/saved-jobs-store';

/** Toggle to save a job locally. Announces state changes to screen readers. */
export function SaveJobButton({ reference }: { reference: string }) {
  const [mounted, setMounted] = useState(false);
  const saved = useSavedJobsStore((s) => s.saved.includes(reference));
  const toggle = useSavedJobsStore((s) => s.toggle);
  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant={saved ? 'accent' : 'outline'}
      onClick={() => toggle(reference)}
      aria-pressed={mounted ? saved : false}
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4" aria-hidden />
          Guardada
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" aria-hidden />
          Guardar
        </>
      )}
    </Button>
  );
}
