'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  FileText,
  Mail,
  Send,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useTranslation } from '@/features/i18n/use-translation';
import type { TranslationKey } from '@/features/i18n/dictionary';
import { cn } from '@/shared/lib/cn';

const LINKS: Array<{
  href: string;
  labelKey: TranslationKey;
  icon: typeof User;
  exact?: boolean;
  badge?: boolean;
}> = [
  { href: '/candidate', labelKey: 'candnav.home', icon: LayoutDashboard, exact: true },
  { href: '/candidate/profile', labelKey: 'candnav.profile', icon: User },
  { href: '/candidate/cv', labelKey: 'candnav.cv', icon: FileText },
  { href: '/candidate/cover-letters', labelKey: 'candnav.letters', icon: Mail },
  { href: '/candidate/applications', labelKey: 'candnav.applications', icon: Send },
  { href: '/candidate/assessments', labelKey: 'candnav.assessments', icon: ClipboardCheck },
  { href: '/candidate/notifications', labelKey: 'candnav.notifications', icon: Bell, badge: true },
  { href: '/candidate/settings', labelKey: 'candnav.settings', icon: Settings },
];

function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.read).length;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function CandidateSidebar() {
  const pathname = usePathname();
  const logout = useLogout();
  const unread = useUnreadCount();
  const { t } = useTranslation();

  return (
    <nav
      className="glass-subtle sticky top-24 flex flex-col gap-1 rounded-3xl p-3"
      aria-label={t('candnav.section')}
    >
      {LINKS.map((link) => {
        const Icon = link.icon;
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground shadow-glass-sm'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="flex-1">{t(link.labelKey)}</span>
            {link.badge && unread > 0 && (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-semibold text-white"
                aria-label={`${unread}`}
              >
                {unread}
              </span>
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => logout.mutate()}
        className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        {t('nav.logout')}
      </button>
    </nav>
  );
}
