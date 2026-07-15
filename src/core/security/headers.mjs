/**
 * Centralised HTTP security headers for the BDP candidate portal.
 *
 * This file is plain `.mjs` (no TypeScript) so it can be imported directly by
 * `next.config.mjs` without a build step. The values here are intentionally
 * conservative; every allowed origin is documented so a reviewer can audit the
 * attack surface. See SECURITY.md.
 */

/**
 * Build the Content-Security-Policy string.
 *
 * Notes:
 * - `'unsafe-inline'` for styles is required by Next.js/Tailwind runtime style
 *   injection.
 * - Scripts require `'unsafe-inline'` too. Next.js (App Router) bootstraps and
 *   streams the app through inline `<script>` tags (e.g. `self.__next_f.push`),
 *   and this project also runs small inline bootstraps for the theme and the
 *   accessibility preferences before first paint. Those inline scripts are NOT
 *   nonced automatically: Next only adds a nonce when a CSP with a nonce is set
 *   from *middleware* per request, which would force every route to render
 *   dynamically and defeat static optimisation. Since the portal ships static
 *   pages and must run on Vercel out of the box, we allow `'unsafe-inline'`
 *   here. Without it the browser blocks every inline script, React never
 *   hydrates and the page renders blank. `object-src 'none'` + `base-uri
 *   'self'` keep the most dangerous injection vectors closed.
 * - `'unsafe-eval'` is added in development only for React Fast Refresh.
 * - Media/image origins mirror `next.config.mjs` `images.remotePatterns`.
 */
function contentSecurityPolicy() {
  const isDev = process.env.NODE_ENV !== 'production';

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // Tailwind + Next inject runtime <style> tags; inline styles are required.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.supabase.co', 'https://*.r2.dev'],
    'media-src': ["'self'", 'blob:', 'https://*.supabase.co', 'https://*.r2.dev'],
    'font-src': ["'self'", 'data:'],
    // Backend origins (Supabase / Apps Script proxy) are added at integration time.
    'connect-src': ["'self'", ...(isDev ? ['ws:', 'wss:'] : []), 'https://*.supabase.co'],
    'frame-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

/**
 * @returns {{ key: string, value: string }[]}
 */
export function securityHeaders() {
  const headers = [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    {
      key: 'Permissions-Policy',
      // Explicitly deny powerful features the portal never uses.
      value: [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'browsing-topics=()',
        'interest-cohort=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()',
      ].join(', '),
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ];

  // HSTS is only meaningful over HTTPS in production. Documented in SECURITY.md.
  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return headers;
}
