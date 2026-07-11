import Link from 'next/link';
import { Logo } from './Logo';
import { appConfig } from '@/core/config/app-config';

const COLUMNS = [
  {
    title: 'Talento',
    links: [
      { href: '/jobs', label: 'Convocatorias' },
      { href: '/register', label: 'Crear cuenta' },
      { href: '/login', label: 'Ingresar' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { href: '/help', label: 'Centro de ayuda' },
      { href: '/accessibility', label: 'Accesibilidad' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacidad' },
      { href: '/terms', label: 'Términos' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="mt-16 px-3 pb-6">
      <div className="glass-subtle container-page mx-auto rounded-3xl p-8">
        <div className="grid gap-8 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Portal de talento del {appConfig.organization.legalName}. Impulsamos el desarrollo
              productivo de Bolivia con procesos de selección accesibles y transparentes.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} {appConfig.organization.legalName}. La Paz, Bolivia.
          </p>
          <p>Nunca te pediremos pagos para postular. Cuida tu información.</p>
        </div>
      </div>
    </footer>
  );
}
