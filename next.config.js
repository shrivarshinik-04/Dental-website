/**
 * Security headers. Current law: IT Act s.43A / SPDI Rules 2011, Rule 8 (reasonable
 * security practices). From about May 2027: DPDP Act s.8(5) and DPDP Rules 2025, Rule 6.
 *
 * - HSTS and upgrade-insecure-requests are sent only when NODE_ENV=production AND
 *   FORCE_HTTPS=true (src/lib/env.js). Without that flag a production build still works on
 *   plain HTTP (e.g. a test environment opened by IP). Headers are fixed at build time, so
 *   set FORCE_HTTPS for `next build`. Also redirect HTTP to HTTPS at the host.
 * - The CSP only allows resources from this origin, so no third-party request can happen
 *   before consent. If ANALYTICS.src points elsewhere, its origin is added here
 *   automatically (it still only loads after opt-in).
 */
const { ANALYTICS } = require('./src/config/compliance');
const { assertDemoModeAllowed, forceHttps } = require('./src/lib/env');

// Refuse to build or start with DEMO_MODE in production unless explicitly allowed.
assertDemoModeAllowed();

const isDev = process.env.NODE_ENV !== 'production';
const https = forceHttps();
const analyticsOrigin = /^https?:\/\//.test(ANALYTICS.src) ? new URL(ANALYTICS.src).origin : '';

const csp = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ''}${analyticsOrigin ? ` ${analyticsOrigin}` : ''}`,
  // Inline style attributes are used by React components and the template.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}${analyticsOrigin ? ` ${analyticsOrigin}` : ''}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(https ? ['upgrade-insecure-requests'] : [])
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  ...(https ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  // Browsers ignore COOP on non-HTTPS origins (and log a warning), so send it with HTTPS only.
  ...(https ? [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }] : [])
];

const nextConfig = {
  // The e2e tests build into a separate folder so a running `next dev` is not disturbed.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: false,
  poweredByHeader: false,
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Personal data must not be cached by browsers or shared proxies.
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] }
    ];
  }
};

module.exports = nextConfig;
