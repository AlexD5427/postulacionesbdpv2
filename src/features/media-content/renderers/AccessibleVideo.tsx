'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { MediaAsset } from '@/shared/types/domain';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import { cn } from '@/shared/lib/cn';

/**
 * Accessible video player.
 *
 * - Explicit aspect ratio prevents layout shift (CLS).
 * - Auto-pauses when scrolled out of the viewport or when the tab is hidden.
 * - Decorative ambient video is muted + loops; meaningful video shows native
 *   controls, and exposes captions + a transcript link/panel.
 * - Under reduced motion we show the poster image instead of autoplaying.
 * - Never autoplays with sound.
 */
export function AccessibleVideo({
  asset,
  decorative = false,
  className,
}: {
  asset: MediaAsset;
  decorative?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const poster = asset.posterAsset?.publicPreviewURL;
  const src = asset.publicPreviewURL;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !decorative) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && !reduced) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(video);

    const onVisibility = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [decorative, reduced]);

  // Reduced motion (decorative): show a static poster instead of the video.
  if (decorative && reduced && poster) {
    return (
      <div className={cn('relative overflow-hidden', className)} style={{ aspectRatio: asset.aspectRatio ?? '16/9' }}>
        <Image src={poster} alt={asset.altText} fill sizes="100vw" className="object-cover" />
      </div>
    );
  }

  if (!src) {
    // No source available (e.g. private asset needing a signed URL): poster only.
    return (
      <div className={cn('relative overflow-hidden bg-muted', className)} style={{ aspectRatio: asset.aspectRatio ?? '16/9' }}>
        {poster && <Image src={poster} alt={asset.altText} fill sizes="100vw" className="object-cover" />}
      </div>
    );
  }

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: asset.aspectRatio ?? '16/9' }}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster={poster}
          controls={!decorative}
          muted={decorative}
          loop={decorative}
          playsInline
          preload="none"
          aria-label={asset.accessibilityDescription ?? asset.altText}
        >
          <source src={src} type={asset.mimeType ?? 'video/mp4'} />
          {asset.transcript && (
            <track kind="captions" srcLang="es" label="Español" default />
          )}
          Tu navegador no puede reproducir este video.
        </video>
      </div>
      {(asset.caption || asset.transcript) && (
        <figcaption className="flex flex-col gap-1 text-sm text-muted-foreground">
          {asset.caption && <span>{asset.caption}</span>}
          {asset.transcript && (
            <>
              <button
                type="button"
                className="w-fit text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={showTranscript}
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? 'Ocultar transcripción' : 'Ver transcripción'}
              </button>
              {showTranscript && <p className="rounded-md bg-muted p-3 text-foreground">{asset.transcript}</p>}
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}
