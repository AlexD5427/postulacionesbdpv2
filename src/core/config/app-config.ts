import { env } from './env';

/**
 * Static, brandable application configuration. The bank can later drive these
 * from the ATS/admin without touching components.
 */
export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  shortName: 'BDP Talento',
  organization: {
    legalName: 'Banco de Desarrollo Productivo BDP S.A.M.',
    city: 'La Paz',
    country: 'Bolivia',
    supportEmail: 'talento@bdp.com.bo',
    supportPhone: '+591 2 000 0000',
  },
  locale: 'es-BO',
  language: 'es',
  /** Where "contact us" / accommodation requests route in the MVP. */
  accommodationsContact: 'accesibilidad@bdp.com.bo',
  legal: {
    privacyVersion: '2026-01',
    termsVersion: '2026-01',
    consentPolicyReference: 'BDP-EVAL-CONSENT-2026-01',
  },
} as const;

export type AppConfig = typeof appConfig;
