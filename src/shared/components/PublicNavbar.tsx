'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/design-system/primitives/Button';
import { ThemeToggle } from '@/design-system/themes/ThemeToggle';
import { cn } from '@/shared/lib/cn';

const NAV_LINKS = [
  { href: '/jobs', label: 'Convocatorias' },
  { href: '/help', label: 'Ayuda' },
  { href: '/accessibility', label: 'Accesibilidad' },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-nav px-3 pt-3">
      <nav
        className="glass-navigation container-page mx-auto flex items-center justify-between gap-4 rounded-full px-4 py-2.5"
        aria-label="Navegación principal"
      >
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/register">Crear cuenta</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="glass-elevated container-page mx-auto mt-2 rounded-3xl p-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link href="/login" onClick={() => setOpen(false)}>
                Ingresar
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/register" onClick={() => setOpen(false)}>
                Crear cuenta
              </Link>
            </Button>
            <div className="mt-2 flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
