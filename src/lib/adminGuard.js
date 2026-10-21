/**
 * Server-side admin guards with brute-force throttling (Node only).
 * Access control and protection of credentials: SPDI Rules 2011, Rule 8 (now);
 * DPDP Rules 2025, Rule 6(1)(b) (from about May 2027).
 *
 * Every admin page (getServerSideProps via src/lib/adminData.js) and admin API route
 * must call one of these. Failed logins are counted per client IP; after
 * MAX_FAILURES within the window, further attempts get 429 without checking the password.
 * Middleware cannot do this because Edge middleware has no client socket address.
 */
import { can, verifyBasicAuth } from './adminAuth';
import { hashedIp } from './http';
import { consume, isBlocked } from './rateLimit';

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const CHALLENGE = 'Basic realm="Clinic admin", charset="UTF-8"';

/** @returns {Promise<{ admin?: object, status?: 401|403|429, retryAfterSeconds?: number }>} */
const authenticate = async (req, permission) => {
  const key = `admin-auth-fail:${hashedIp(req)}`;
  const throttle = await isBlocked(key, { limit: MAX_FAILURES });
  if (throttle.blocked) return { status: 429, retryAfterSeconds: throttle.retryAfterSeconds };

  const admin = await verifyBasicAuth(req.headers.authorization);
  if (!admin) {
    // Count only real attempts, not the browser's first request without credentials.
    if (req.headers.authorization) await consume(key, { limit: MAX_FAILURES, windowMs: WINDOW_MS });
    return { status: 401 };
  }
  if (permission && !can(admin, permission)) return { status: 403, admin };
  return { admin };
};

/** For API routes: returns the admin, or sends 401/403/429 and returns null. */
export const requireAdmin = async (req, res, permission) => {
  const result = await authenticate(req, permission);
  if (result.status === 429) {
    res.setHeader('Retry-After', result.retryAfterSeconds);
    res.status(429).json({ error: 'Too many failed sign-in attempts. Try again later.' });
    return null;
  }
  if (result.status === 401) {
    res.setHeader('WWW-Authenticate', CHALLENGE);
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  if (result.status === 403) {
    res.status(403).json({ error: 'Your role does not allow this' });
    return null;
  }
  return result.admin;
};

/** For getServerSideProps on /admin pages. */
export const adminPageGuard = async ({ req, res }, permission) => {
  const result = await authenticate(req, permission);
  if (result.status === 429) {
    res.statusCode = 429;
    res.setHeader('Retry-After', result.retryAfterSeconds);
    return { denied: { props: { denied: 'throttled' } } };
  }
  if (result.status === 401) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', CHALLENGE);
    return { denied: { props: { denied: 'unauthenticated' } } };
  }
  if (result.status === 403) {
    res.statusCode = 403;
    return { denied: { props: { denied: 'forbidden', admin: result.admin } } };
  }
  return { admin: result.admin };
};
