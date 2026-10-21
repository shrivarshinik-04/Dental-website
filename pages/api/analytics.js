/**
 * First-party analytics collection (decision D1). Records a page view only when the
 * visitor's consent cookie shows analytics consent for the current notice version, so the
 * cookie-banner choice gates the processing on the server as well as in the browser.
 * Never records pages that collect health or identity data (NO_TRACKING_PATHS).
 * Stored: visitor ID (from the dc_vid cookie), path without query string, referrer origin,
 * time. No IP address or user agent is stored.
 *
 * Basis: consent given in the cookie banner (recorded in ConsentRecord). Erasure on
 * withdrawal happens in /api/consent.
 */
import { z } from 'zod';
import { NO_TRACKING_PATHS, NOTICE_VERSION } from 'config/compliance';
import prisma from 'lib/db';
import { eraseAnalytics, visitorIdFrom } from 'lib/analytics';
import { allowMethods, hashedIp, parseCookies, rateLimit, requireSameOrigin, withErrors } from 'lib/http';

const schema = z
  .object({
    path: z.string().max(200).regex(/^\/[^\s]*$/),
    referrerOrigin: z
      .string()
      .max(200)
      .regex(/^https?:\/\/[^/\s]+$/)
      .nullable()
      .optional()
  })
  .strict();

const hasAnalyticsConsent = (cookies) => {
  try {
    const consent = JSON.parse(cookies.dpdp_consent || 'null');
    return Boolean(consent && consent.v === NOTICE_VERSION && consent.c && consent.c.analytics === true);
  } catch {
    return false;
  }
};

const isBlockedPath = (path) => NO_TRACKING_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST', 'DELETE']) || !requireSameOrigin(req, res)) return;
  if (!(await rateLimit(req, res, { key: 'analytics', limit: 120, windowMs: 10 * 60 * 1000 }))) return;

  // DELETE: the browser is dropping its analytics cookie (notice changed, child's booking
  // session): erase what was recorded under it first.
  if (req.method === 'DELETE') {
    await eraseAnalytics(req, res, { ipHash: hashedIp(req) });
    return res.status(204).end();
  }

  const cookies = parseCookies(req);
  // No consent (or consent for an older notice): accept the request but record nothing.
  if (!hasAnalyticsConsent(cookies)) return res.status(204).end();

  const visitorId = visitorIdFrom(req);
  if (!visitorId) return res.status(400).json({ error: 'Invalid request' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  const path = parsed.data.path.split(/[?#]/)[0];
  if (isBlockedPath(path)) return res.status(204).end();

  await prisma.analyticsEvent.create({
    data: { visitorId, path, referrerOrigin: parsed.data.referrerOrigin || null }
  });
  res.status(204).end();
});
