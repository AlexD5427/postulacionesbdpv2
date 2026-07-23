'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BdpMark } from '@/shared/components/brand/BdpMark';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import { useTranslation } from '@/features/i18n/use-translation';

const SESSION_KEY = 'bdp.intro.v1';

/**
 * First-load intro. A short, polished brand splash — the BDP isotype draws in,
 * the "Trabaja en BDP S.A.M." wordline rises, and the panel lifts away to reveal
 * the app. Shown ONCE per browser session (sessionStorage) and shortened under
 * reduced motion so it never gets in the way.
 */
export function Preloader() {
  const reduced = useReducedMotion();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Skip if already played this session.
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    setShow(true);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    const timeout = window.setTimeout(() => setShow(false), reduced ? 650 : 2300);
    return () => window.clearTimeout(timeout);
  }, [reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="preloader grain"
          role="status"
          aria-label={t('preloader.title')}
          initial={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: '-3%' }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* soft breathing halo */}
          {!reduced && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute h-[36rem] w-[36rem] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25), transparent 60%)' }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.7, 1.05, 0.9], opacity: [0, 0.8, 0.5] }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />
          )}

          <div className="relative flex flex-col items-center gap-6 px-6 text-center">
            <motion.div
              initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0, rotate: -12 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              className="grid h-24 w-24 place-items-center rounded-3xl bg-white/12 p-4 shadow-glass-xl backdrop-blur"
            >
              <BdpMark tone="white" className="h-full w-full" />
            </motion.div>

            <div className="overflow-hidden">
              <motion.h1
                className="text-display text-3xl font-bold text-white md:text-5xl"
                initial={reduced ? { opacity: 0 } : { y: '110%' }}
                animate={reduced ? { opacity: 1 } : { y: '0%' }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: reduced ? 0 : 0.25 }}
              >
                {t('preloader.title')}
              </motion.h1>
            </div>

            <motion.p
              className="max-w-md text-sm text-on-brand-muted md:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: reduced ? 0.1 : 0.6 }}
            >
              {t('preloader.subtitle')}
            </motion.p>

            {!reduced && (
              <motion.div
                aria-hidden
                className="mt-2 h-0.5 w-40 overflow-hidden rounded-full bg-white/25"
              >
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
