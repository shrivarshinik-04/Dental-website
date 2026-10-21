/**
 * Server helpers for the first-party analytics (decision D1). Server-only.
 */
import { ANALYTICS } from 'config/compliance';
import prisma from './db';
import { audit } from './audit';
import { appendCookie, parseCookies, serializeCookie } from './http';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const visitorIdFrom = (req) => {
  const id = parseCookies(req)[ANALYTICS.cookie];
  return id && UUID.test(id) ? id : null;
};

/**
 * Erases every analytics event recorded under this browser's visitor ID and deletes the
 * cookie. Used on withdrawal and whenever the browser drops the analytics cookie.
 * @returns {Promise<number>} events erased
 */
export const eraseAnalytics = async (req, res, { actor = 'public', ipHash, reference } = {}) => {
  const visitorId = visitorIdFrom(req);
  if (!visitorId) return 0;
  const { count } = await prisma.analyticsEvent.deleteMany({ where: { visitorId } });
  await audit({ actor, action: 'DELETE', entity: 'AnalyticsEvent', entityId: reference || null, ipHash, detail: `events=${count}` });
  appendCookie(res, serializeCookie(ANALYTICS.cookie, '', { maxAge: 0, httpOnly: false }));
  return count;
};
