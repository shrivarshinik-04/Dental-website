/**
 * Cookie consent ledger endpoint (collection point B).
 * DPDP Act s.6(1), s.6(4), s.6(10): every choice, including refusal and withdrawal,
 * is appended to ConsentRecord with the notice version shown. Raw IPs are never stored.
 */
import crypto from 'crypto';
import { NOTICE_VERSION } from 'config/compliance';
import prisma from 'lib/db';
import { auditMany } from 'lib/audit';
import { ensureNoticeVersion } from 'lib/noticeContent';
import { cookieConsentSchema } from 'lib/validation';
import { CATEGORIES, CATEGORY_PURPOSE } from 'lib/consentCategories';
import {
  allowMethods,
  appendCookie,
  hashedIp,
  parseCookies,
  rateLimit,
  requireSameOrigin,
  serializeCookie,
  userAgent,
  withErrors
} from 'lib/http';

const ONE_YEAR = 365 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!rateLimit(req, res, { key: 'consent', limit: 30, windowMs: 10 * 60 * 1000 })) return;

  const parsed = cookieConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  const { choices, language, noticeVersion } = parsed.data;
  if (noticeVersion !== NOTICE_VERSION) return res.status(409).json({ error: 'The notice has changed. Please reload.' });

  const existingId = parseCookies(req).dpdp_aid;
  const anonymousId = existingId && UUID.test(existingId) ? existingId : crypto.randomUUID();
  const ipHash = hashedIp(req);
  const ua = userAgent(req);
  const timestamp = new Date();

  await prisma.$transaction(async (tx) => {
    const notice = await ensureNoticeVersion(tx, language);
    const previous = await Promise.all(
      CATEGORIES.map((category) =>
        tx.consentRecord.findFirst({
          where: { anonymousId, purpose: CATEGORY_PURPOSE[category] },
          orderBy: { timestamp: 'desc' },
          select: { status: true }
        })
      )
    );
    const rows = CATEGORIES.map((category, i) => ({
      anonymousId,
      purpose: CATEGORY_PURPOSE[category],
      // Turning off something previously given is a withdrawal (s.6(4)); otherwise a refusal.
      status: choices[category] ? 'GIVEN' : previous[i]?.status === 'GIVEN' ? 'WITHDRAWN' : 'DENIED',
      noticeVersionId: notice.id,
      language,
      channel: 'COOKIE_BANNER',
      ipHash,
      userAgent: ua,
      timestamp
    }));
    await tx.consentRecord.createMany({ data: rows });
    await auditMany(
      rows.map((r) => ({
        actor: 'public',
        action: 'CREATE',
        entity: 'ConsentRecord',
        entityId: anonymousId,
        ipHash,
        detail: `${r.purpose}=${r.status}`
      })),
      tx
    );
  });

  const consentCookie = JSON.stringify({ v: NOTICE_VERSION, c: choices, ts: timestamp.toISOString() });
  appendCookie(res, serializeCookie('dpdp_aid', anonymousId, { maxAge: ONE_YEAR }));
  appendCookie(res, serializeCookie('dpdp_consent', consentCookie, { maxAge: ONE_YEAR, httpOnly: false }));
  res.status(200).json({ version: NOTICE_VERSION, timestamp: timestamp.toISOString(), choices });
});
