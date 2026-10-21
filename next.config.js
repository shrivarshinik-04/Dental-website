/**
 * Security headers: DPDP Act s.8(5) reasonable security safeguards; DPDP Rules 2025,
 * Rule 6(1)(a) (secure transmission) and 6(1)(c) (prevent unauthorised access).
 *
 * - HSTS forces HTTPS for two years. It only takes effect when the site is served over
 *   HTTPS; also redirect HTTP to HTTPS at your host / load balancer.
 * - The CSP only allows resources from this origin, so no third-party request can happen
 *   before consent. If you set ANALYTICS.src in src/config/compliance.js, its origin is
 *   added here automatically (it still only loads after opt-in).
 */
const { ANALYTICS } = require('./src/config/compliance');

const isDev = process.env.NODE_ENV !== 'production';
const analyticsOrigin = ANALYTICS.src ? new URL(ANALYTICS.src).origin : '';

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
  ...(isDev ? [] : ['upgrade-insecure-requests'])
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
];

const nextConfig = {
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
