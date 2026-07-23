import type { MetadataRoute } from 'next';
import { appConfig } from '@/core/config/app-config';

/**
 * Web App Manifest — makes the portal installable (Add to Home Screen) with the
 * BDP brand identity. Colours match the brand gradient endpoints. A dedicated
 * maskable icon keeps the mark safe inside platform masks.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appConfig.shortName} — ${appConfig.organization.legalName}`,
    short_name: appConfig.shortName,
    description:
      'Portal de talento del Banco de Desarrollo Productivo BDP S.A.M. Explora convocatorias, gestiona tu perfil y postula.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#004282',
    theme_color: '#004282',
    lang: 'es-BO',
    dir: 'ltr',
    categories: ['business', 'productivity', 'government'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/bdp-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
