/**
 * Runtime flags for transport, proxy trust and the demo OTP mode.
 * Security safeguards: SPDI Rules 2011, Rule 8 (now); DPDP Rules 2025, Rule 6 (from
 * about May 2027). CommonJS because next.config.js reads it.
 *
 * FORCE_HTTPS=true        Send HSTS + upgrade-insecure-requests and mark cookies Secure.
 *                         Only honoured when NODE_ENV=production. Read at build time by
 *                         next.config.js, so set it for `next build` as well as `next start`.
 * TRUST_PROXY=true        Take the client IP from X-Forwarded-For. Only set this behind a
 *                         reverse proxy that overwrites the header; otherwise clients can
 *                         spoof it to dodge rate limits and falsify consent evidence.
 * DEMO_MODE=true          Show one-time codes on screen instead of sending them (test
 *                         environments only). Refused when NODE_ENV=production unless
 *                         ALLOW_DEMO_IN_PROD=true is also set.
 */

const flag = (name) => String(process.env[name] || '').trim().toLowerCase() === 'true';

const isProduction = () => process.env.NODE_ENV === 'production';

const forceHttps = () => isProduction() && flag('FORCE_HTTPS');

const trustProxy = () => flag('TRUST_PROXY');

class DemoModeError extends Error {}

/** Throws if DEMO_MODE is set in production without the explicit override. */
const assertDemoModeAllowed = () => {
  if (flag('DEMO_MODE') && isProduction() && !flag('ALLOW_DEMO_IN_PROD')) {
    throw new DemoModeError(
      'DEMO_MODE=true is refused when NODE_ENV=production. It shows one-time codes on screen, so anyone ' +
        'who knows a reference ID and phone number could open that person\'s records. Unset DEMO_MODE, or set ' +
        'ALLOW_DEMO_IN_PROD=true only for a closed test environment with synthetic data.'
    );
  }
};

const demoMode = () => {
  assertDemoModeAllowed();
  return flag('DEMO_MODE');
};

module.exports = { isProduction, forceHttps, trustProxy, demoMode, assertDemoModeAllowed, DemoModeError };
