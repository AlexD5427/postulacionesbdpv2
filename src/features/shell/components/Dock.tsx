'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion';
import {
  Briefcase,
  Search,
  Compass,
  LogIn,
  User,
  LifeBuoy,
  Accessibility,
  Shield,
  ScrollText,
  FileText,
  Mail,
  Send,
  ClipboardCheck,
  Bell,
  Settings,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { BdpMark } from '@/shared/components/brand/BdpMark';
import { useUiStore, toggleCommandPalette } from '../state/ui-store';
import { useSession, useLogout } from '@/features/auth/hooks/use-auth';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import { useTranslation } from '@/features/i18n/use-translation';
import type { TranslationKey } from '@/features/i18n/dictionary';
import { cn } from '@/shared/lib/cn';

const BASE = 44;
const MAX = 64;

type SubLink = { href: string; labelKey: TranslationKey; icon: typeof Briefcase };

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A single magnifying dock cell (link or button). */
function DockCell({
  mouseX,
  reduced,
  active,
  label,
  children,
  onClick,
  href,
  ariaHasPopup,
  ariaExpanded,
  position,
}: {
  mouseX: MotionValue<number>;
  reduced: boolean;
  active?: boolean;
  label: string;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  ariaHasPopup?: boolean;
  ariaExpanded?: boolean;
  position: 'bottom' | 'top';
}) {
  const ref = useRef<HTMLElement>(null);
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return 9999;
    return val - bounds.left - bounds.width / 2;
  });
  const sizeSync = useTransform(distance, [-150, 0, 150], [BASE, MAX, BASE]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 170, damping: 14 });

  const tooltip = (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-glass-md transition-opacity duration-150 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100',
        position === 'bottom' ? 'bottom-full mb-2' : 'top-full mt-2',
      )}
    >
      {label}
    </span>
  );

  const content = <span className="grid h-full w-full place-items-center p-2.5">{children}</span>;
  const style = reduced ? { width: BASE, height: BASE } : { width: size, height: size };

  return (
    <motion.div style={style} className="group/cell relative">
      {href ? (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          data-active={active ? 'true' : undefined}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className="dock-item h-full w-full"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          ref={ref as React.Ref<HTMLButtonElement>}
          data-active={active ? 'true' : undefined}
          aria-label={label}
          aria-haspopup={ariaHasPopup || undefined}
          aria-expanded={ariaExpanded}
          onClick={onClick}
          className="dock-item h-full w-full"
        >
          {content}
        </button>
      )}
      {tooltip}
    </motion.div>
  );
}

/** Expandable dock group with a spring popover of sub-links. */
function DockGroup({
  mouseX,
  reduced,
  label,
  icon: Icon,
  links,
  position,
  active,
  extra,
}: {
  mouseX: MotionValue<number>;
  reduced: boolean;
  label: string;
  icon: typeof Briefcase;
  links: SubLink[];
  position: 'bottom' | 'top';
  active?: boolean;
  extra?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={wrapRef} className="relative">
      <DockCell
        mouseX={mouseX}
        reduced={reduced}
        active={active}
        label={label}
        position={position}
        ariaHasPopup
        ariaExpanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className="h-full w-full" aria-hidden />
      </DockCell>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: position === 'bottom' ? 10 : -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 10 : -10, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              'glass-elevated absolute left-1/2 z-overlay w-60 -translate-x-1/2 rounded-3xl p-2 shadow-glass-xl',
              position === 'bottom' ? 'bottom-full mb-3' : 'top-full mt-3',
            )}
          >
            {links.map((link) => {
              const LinkIcon = link.icon;
              const linkActive = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                    linkActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <LinkIcon className="h-5 w-5 shrink-0" aria-hidden />
                  {t(link.labelKey)}
                </Link>
              );
            })}
            {extra}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EXPLORE_LINKS: SubLink[] = [
  { href: '/help', labelKey: 'nav.help', icon: LifeBuoy },
  { href: '/accessibility', labelKey: 'nav.accessibility', icon: Accessibility },
  { href: '/privacy', labelKey: 'footer.link.privacy', icon: Shield },
  { href: '/terms', labelKey: 'footer.link.terms', icon: ScrollText },
];

const CANDIDATE_LINKS: SubLink[] = [
  { href: '/candidate', labelKey: 'candnav.home', icon: LayoutDashboard },
  { href: '/candidate/profile', labelKey: 'candnav.profile', icon: User },
  { href: '/candidate/cv', labelKey: 'candnav.cv', icon: FileText },
  { href: '/candidate/cover-letters', labelKey: 'candnav.letters', icon: Mail },
  { href: '/candidate/applications', labelKey: 'candnav.applications', icon: Send },
  { href: '/candidate/assessments', labelKey: 'candnav.assessments', icon: ClipboardCheck },
  { href: '/candidate/notifications', labelKey: 'candnav.notifications', icon: Bell },
  { href: '/candidate/settings', labelKey: 'candnav.settings', icon: Settings },
];

const HIDE_ON = ['/login', '/register', '/forgot-password', '/reset-password'];

/** Hide the dock during focused flows (auth screens + the assessment runner). */
function shouldHideDock(pathname: string): boolean {
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return true;
  // Assessment runner is a focused, distraction-light screen: /candidate/assessments/<id>
  if (/^\/candidate\/assessments\/[^/]+/.test(pathname)) return true;
  return false;
}

/**
 * The global floating Dock — the portal's primary quick-navigation, inspired by
 * the macOS dock: proximity magnification, spring pop-overs and the BDP isotype
 * standing in for the usual "home" glyph. Bottom by default; a setting flips it
 * to the top. Fully keyboard-navigable and reduced-motion aware.
 */
export function Dock() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const position = useUiStore((s) => s.dockPosition);
  const { data: session } = useSession();
  const logout = useLogout();
  const mouseX = useMotionValue(Infinity);
  const inCandidate = pathname.startsWith('/candidate');

  if (shouldHideDock(pathname)) return null;

  return (
    <motion.nav
      aria-label={t('dock.label')}
      data-position={position}
      data-tour="dock"
      className="dock-shell glass-navigation shadow-glass-xl"
      initial={reduced ? false : { opacity: 0, y: position === 'bottom' ? 24 : -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
      onMouseMove={(e) => !reduced && mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {/* Home = BDP isotype (replaces the usual house icon). */}
      <DockCell
        mouseX={mouseX}
        reduced={reduced}
        active={isActivePath(pathname, '/')}
        label={t('dock.home')}
        href="/"
        position={position}
      >
        <BdpMark tone="brand" className="h-full w-full" />
      </DockCell>

      <DockCell
        mouseX={mouseX}
        reduced={reduced}
        active={isActivePath(pathname, '/jobs')}
        label={t('dock.jobs')}
        href="/jobs"
        position={position}
      >
        <Briefcase className="h-full w-full" aria-hidden />
      </DockCell>

      <DockCell
        mouseX={mouseX}
        reduced={reduced}
        label={t('dock.search')}
        position={position}
        onClick={() => toggleCommandPalette()}
      >
        <Search className="h-full w-full" aria-hidden />
      </DockCell>

      <DockGroup
        mouseX={mouseX}
        reduced={reduced}
        label={t('action.explore')}
        icon={Compass}
        links={EXPLORE_LINKS}
        position={position}
      />

      {session ? (
        <DockGroup
          mouseX={mouseX}
          reduced={reduced}
          label={t('dock.account')}
          icon={User}
          links={CANDIDATE_LINKS}
          position={position}
          active={inCandidate}
          extra={
            <button
              type="button"
              onClick={() => logout.mutate()}
              role="menuitem"
              className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              {t('nav.logout')}
            </button>
          }
        />
      ) : (
        <DockCell
          mouseX={mouseX}
          reduced={reduced}
          active={isActivePath(pathname, '/login')}
          label={t('nav.login')}
          href="/login"
          position={position}
        >
          <LogIn className="h-full w-full" aria-hidden />
        </DockCell>
      )}
    </motion.nav>
  );
}
