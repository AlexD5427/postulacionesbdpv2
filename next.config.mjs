import { securityHeaders } from './src/core/security/headers.mjs';

/**
 * Next.js configuration for the BDP public candidate portal.
 *
 * Security headers (including a Content-Security-Policy) are defined centrally
 * in src/core/security/headers.mjs so they can be reviewed in one place and
 * reused by tests. See SECURITY.md for the rationale behind each directive.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fail the production build on type or lint errors instead of silently shipping.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  images: {
    // Public preview media may be served from configured providers only.
    // Add real hosts here (and to the CSP) once the backend is connected.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
