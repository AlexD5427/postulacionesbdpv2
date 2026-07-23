import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
import { appConfig } from '@/core/config/app-config';
import { assertProviderConfig } from '@/core/config/env';
import { A11Y_STORAGE_KEY } from '@/features/accessibility/state/storage-key';
import { I18N_STORAGE_KEY } from '@/features/i18n/storage-key';
import { AccessibilityLauncher } from '@/features/accessibility/components/AccessibilityLauncher';
import { ColorVisionFilters } from '@/features/accessibility/components/ColorVisionFilters';
import { ShellChrome } from '@/features/shell/components/ShellChrome';
import { SkipLink } from '@/shared/components/SkipLink';

// Validate provider configuration once at module load (server).
assertProviderConfig();

export const metadata: Metadata = {
  title: {
    default: `${appConfig.shortName} — ${appConfig.organization.legalName}`,
    template: `%s · ${appConfig.shortName}`,
  },
  description:
    'Portal de talento del Banco de Desarrollo Productivo BDP S.A.M. Explora convocatorias, gestiona tu perfil y postula de forma accesible y segura.',
  applicationName: appConfig.shortName,
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: appConfig.shortName,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Applies persisted accessibility preferences (font scale, contrast, motion,
 * transparency, reading, color vision, cursor…) AND the chosen locale BEFORE
 * first paint to avoid a flash of default styling/language. Kept tiny and
 * dependency-free; it mirrors applyAccessibilityToDocument + applyLocaleToDocument.
 */
const preferencesBootstrap = `
(function () {
  var el = document.documentElement;
  try {
    var raw = localStorage.getItem('${A11Y_STORAGE_KEY}');
    var p = raw ? (JSON.parse(raw).state || {}) : {};
    el.style.setProperty('--a11y-font-scale', String(p.fontScale || 1));
    el.setAttribute('data-contrast', p.contrast || 'normal');
    el.setAttribute('data-transparency', p.transparency || 'normal');
    el.setAttribute('data-reading', p.reading || 'normal');
    el.setAttribute('data-highlight-links', String(p.highlightLinks || false));
    el.setAttribute('data-focus', p.enhancedFocus ? 'enhanced' : 'normal');
    el.setAttribute('data-colorblind', p.colorVision || 'none');
    el.setAttribute('data-reading-font', p.readingFont || 'default');
    el.setAttribute('data-cursor', p.largeCursor ? 'large' : 'normal');
    var osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var motion = p.motion || 'system';
    var reduced = motion === 'reduced' || (motion === 'system' && osReduced);
    el.setAttribute('data-motion', reduced ? 'reduced' : 'full');
  } catch (e) {}
  try {
    var lraw = localStorage.getItem('${I18N_STORAGE_KEY}');
    var lp = lraw ? (JSON.parse(lraw).state || {}) : {};
    var map = { es: 'es-BO', en: 'en', qu: 'qu', ay: 'ay' };
    if (lp.locale && map[lp.locale]) el.lang = map[lp.locale];
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-BO" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesBootstrap }} />
      </head>
      <body>
        <div className="ambient-bg" aria-hidden />
        <ColorVisionFilters />
        <Providers>
          <SkipLink />
          {children}
          <ShellChrome />
          <AccessibilityLauncher />
        </Providers>
      </body>
    </html>
  );
}
