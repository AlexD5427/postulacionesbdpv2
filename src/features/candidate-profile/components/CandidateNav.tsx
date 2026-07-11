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
import { cn } from '@/shared/lib/cn';

const LINKS = [
  { href: '/candidate', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/candidate/profile', label: 'Perfil', icon: User },
  { href: '/candidate/cv', label: 'CV digital', icon: FileText },
  { href: '/candidate/cover-letters', label: 'Cartas', icon: Mail },
  { href: '/candidate/applications', label: 'Postulaciones', icon: Send },
  { href: '/candidate/assessments', label: 'Evaluaciones', icon: ClipboardCheck },
  { href: '/candidate/notifications', label: 'Notificaciones', icon: Bell, badge: true },
  { href: '/candidate/settings', label: 'Ajustes', icon: Settings },
];

// Primary items shown in the mobile bottom navigation.
const MOBILE_LINKS = LINKS.filter((l) =>
  ['/candidate', '/candidate/applications', '/candidate/assessments', '/candidate/notifications'].includes(l.href),
);

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

  return (
    <nav className="glass-subtle sticky top-24 flex flex-col gap-1 rounded-3xl p-3" aria-label="Navegación del candidato">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary text-primary-foreground shadow-glass-sm' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="flex-1">{link.label}</span>
            {link.badge && unread > 0 && (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-semibold text-white"
                aria-label={`${unread} sin leer`}
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
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Cerrar sesión
      </button>
    </nav>
  );
}

export function CandidateBottomNav() {
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <nav
      className="glass-navigation fixed inset-x-3 bottom-3 z-nav flex items-center justify-around rounded-full px-2 py-1.5 lg:hidden"
      aria-label="Navegación del candidato"
    >
      {MOBILE_LINKS.map((link) => {
        const Icon = link.icon;
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[0.7rem] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {link.label}
            {link.badge && unread > 0 && (
              <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-danger" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
