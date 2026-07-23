'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Briefcase,
  Home,
  LifeBuoy,
  Accessibility,
  LogIn,
  UserPlus,
  CornerDownLeft,
} from 'lucide-react';
import { subscribeCommandPalette, setCommandPalette } from '../state/ui-store';
import { useJobsInfinite } from '@/features/jobs/hooks/use-jobs';
import { useTranslation } from '@/features/i18n/use-translation';
import type { TranslationKey } from '@/features/i18n/dictionary';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import { cn } from '@/shared/lib/cn';

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  group: 'nav' | 'jobs' | 'actions';
  run: () => void;
};

const NAV: Array<{ href: string; labelKey: TranslationKey; icon: typeof Home; group: 'nav' | 'actions' }> = [
  { href: '/', labelKey: 'nav.home', icon: Home, group: 'nav' },
  { href: '/jobs', labelKey: 'nav.jobs', icon: Briefcase, group: 'nav' },
  { href: '/help', labelKey: 'nav.help', icon: LifeBuoy, group: 'nav' },
  { href: '/accessibility', labelKey: 'nav.accessibility', icon: Accessibility, group: 'nav' },
  { href: '/login', labelKey: 'nav.login', icon: LogIn, group: 'actions' },
  { href: '/register', labelKey: 'nav.register', icon: UserPlus, group: 'actions' },
];

export function CommandPalette() {
  const router = useRouter();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load jobs lazily (only meaningful once opened; query is cheap in mock).
  const { data } = useJobsInfinite({});
  const jobs = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  // Open via ⌘K / Ctrl+K and via the shared event bus (dock button).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPalette(true);
      }
    };
    document.addEventListener('keydown', onKey);
    const unsub = subscribeCommandPalette(setOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after mount.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      document.documentElement.style.overflow = 'hidden';
      return () => {
        window.clearTimeout(id);
        document.documentElement.style.overflow = '';
      };
    }
  }, [open]);

  const close = () => setCommandPalette(false);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const navItems: Item[] = NAV.map((n) => ({
      id: `nav:${n.href}`,
      label: t(n.labelKey),
      icon: n.icon,
      group: n.group,
      run: () => {
        router.push(n.href);
        close();
      },
    }));
    const jobItems: Item[] = jobs.map((job) => ({
      id: `job:${job.reference}`,
      label: job.title,
      hint: `${job.reference} · ${job.city}`,
      icon: Briefcase,
      group: 'jobs' as const,
      run: () => {
        router.push(`/jobs/${job.reference}`);
        close();
      },
    }));
    const all = [...navItems, ...jobItems];
    if (!q) return all;
    return all.filter(
      (i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q),
    );
  }, [query, jobs, t, router]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  const groupLabels: Record<Item['group'], string> = {
    nav: t('cmd.group.nav'),
    jobs: t('cmd.group.jobs'),
    actions: t('cmd.group.actions'),
  };

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label={t('action.close')}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('cmd.open')}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            className="glass-modal relative z-content w-full max-w-xl overflow-hidden rounded-3xl"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('cmd.placeholder')}
                className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                aria-label={t('cmd.placeholder')}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('cmd.empty')}</p>
              ) : (
                (['nav', 'jobs', 'actions'] as const).map((group) => {
                  const groupItems = items.filter((i) => i.group === group);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group} className="mb-1">
                      <p className="px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {groupLabels[group]}
                      </p>
                      {groupItems.map((item) => {
                        flatIndex += 1;
                        const idx = flatIndex;
                        const Icon = item.icon;
                        const isActive = idx === active;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseMove={() => setActive(idx)}
                            onClick={item.run}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors',
                              isActive ? 'bg-primary/12 text-primary' : 'text-foreground hover:bg-muted',
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="flex-1 truncate font-medium">{item.label}</span>
                            {item.hint && (
                              <span className="truncate text-xs text-muted-foreground">{item.hint}</span>
                            )}
                            {isActive && <CornerDownLeft className="h-4 w-4 shrink-0 opacity-70" aria-hidden />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
              {t('cmd.hint')}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
