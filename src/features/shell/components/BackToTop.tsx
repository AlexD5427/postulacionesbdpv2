'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from '@/features/i18n/use-translation';

/**
 * Floating "back to top" button that appears after the first viewport of
 * scrolling. Scrolls through the Lenis engine when available (matching the
 * page's smooth feel), otherwise falls back to native smooth scroll.
 */
export function BackToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function toTop() {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={toTop}
          aria-label={t('util.backToTop')}
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          className="glass-floating fixed bottom-24 right-5 z-nav inline-flex h-11 w-11 items-center justify-center rounded-full text-primary shadow-glass-lg hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100 md:bottom-5 md:right-20"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
