/**
 * Shared helpers for API routes: method guard, client IP hashing, rate limiting,
 * cookies and safe error handling.
 * Rule 6(1) security safeguards: hashed IPs only, no personal data in logs,
 * throttling of public endpoints.
 */
import { hmac } from './crypto';

const isProd = process.env.NODE_ENV === 'production';

export const clientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

/** SHA-256 HMAC of the client IP with a server-side salt. The raw IP is never stored. */
export const hashedIp = (req) => hmac(clientIp(req));

export const userAgent = (req) => String(req.headers['user-agent'] || '').slice(0, 300);

// ---------------------------------------------------------------------------
// Fixed-window in-memory rate limiter. Good enough for a single instance; use a
// shared store (e.g. Redis) when running more than one server.
// ---------------------------------------------------------------------------
const buckets = new Map();

export const rateLimit = (req, res, { key, limit, windowMs }) => {
  const id = `${key}:${hashedIp(req)}`;
  const now = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    return false;
  }
  return true;
};

export const allowMethods = (req, res, methods) => {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
  return false;
};

export const parseCookies = (req) =>
  Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf('=');
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );

export const serializeCookie = (name, value, { maxAge, httpOnly = true, path = '/' } = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'SameSite=Lax'];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push('HttpOnly');
  if (isProd) parts.push('Secure');
  return parts.join('; ');
};

export const appendCookie = (res, cookie) => {
  const existing = res.getHeader('Set-Cookie');
  const list = existing ? [].concat(existing) : [];
  res.setHeader('Set-Cookie', [...list, cookie]);
};

/**
 * Wraps a handler so unexpected errors return a generic message and are logged
 * without request bodies (which contain personal data).
 */
export const withErrors = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error(`[api] ${req.method} ${req.url?.split('?')[0]} failed: ${err?.code || err?.name || 'Error'}`);
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};

export const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * CSRF guard for state-changing requests: the Origin (or Referer) must match the
 * Host. Browsers send basic-auth credentials and cookies automatically, so admin
 * and rights endpoints must not accept cross-site POSTs.
 */
export const requireSameOrigin = (req, res) => {
  const source = req.headers.origin || req.headers.referer;
  let ok = false;
  try {
    ok = Boolean(source) && new URL(source).host === req.headers.host;
  } catch {
    ok = false;
  }
  if (!ok) res.status(403).json({ error: 'Cross-site request blocked' });
  return ok;
};
