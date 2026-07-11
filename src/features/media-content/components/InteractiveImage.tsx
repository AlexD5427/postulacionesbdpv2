'use client';

import Image from 'next/image';
import { useRef, type PointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/shared/lib/cn';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';

/**
 * Image with a subtle, optional pointer-driven tilt/parallax.
 *
 * Accessibility & performance guardrails:
 *  - Motion is disabled when reduced-motion is active.
 *  - Effect only runs for fine pointers (mouse), never touch — so it never
 *    interferes with scrolling on mobile.
 *  - Uses motion values (no React re-render per pointer move).
 *  - No information is hidden behind hover; the image is fully visible at rest.
 */
export function InteractiveImage({
  src,
  alt,
  className,
  sizes = '100vw',
  priority = false,
  focalPointX = 0.5,
  focalPointY = 0.4,
  interactive = true,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  focalPointX?: number;
  focalPointY?: number;
  interactive?: boolean;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const rotateX = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const scale = useSpring(useMotionValue(1), { stiffness: 220, damping: 22 });
  const glareX = useTransform(rotateY, [-6, 6], ['85%', '15%']);
  // Computed unconditionally (hooks must not be conditional).
  const glareBackground = useTransform(
    glareX,
    (x) => `radial-gradient(20rem 20rem at ${x} 20%, rgba(255,255,255,0.5), transparent 60%)`,
  );

  const enabled = interactive && !reduced;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || event.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 8);
    rotateX.set(-py * 8);
    scale.set(1.03);
  }

  function reset() {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  }

  return (
    <motion.div
      ref={ref}
      className={cn('relative overflow-hidden [perspective:1000px]', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      style={enabled ? { rotateX, rotateY, scale, transformStyle: 'preserve-3d' } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%` }}
      />
      {enabled && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
          style={{ background: glareBackground }}
        />
      )}
    </motion.div>
  );
}
