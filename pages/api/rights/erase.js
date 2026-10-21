/**
 * s.12(3) right to erasure, with the s.8(7) exception for data the law requires us
 * to keep (clinical records). Erases everything else at once, tells the person what
 * was kept and why, and instructs Processors to erase their copies (s.8(7)(b)).
 */
import { NOTICE_VERSION } from 'config/compliance';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { ensureNoticeVersion } from 'lib/noticeContent';
import { instructProcessors } from 'lib/notify';
import { endSession } from 'lib/rightsSession';
import { eraseSchema, language as languageSchema } from 'lib/validation';
import { principalRoute } from 'lib/rightsApi';
import { buildSummary, erasePrincipal, loadPrincipal, recordRequest, verificationMethod, withContact } from 'lib/rights';

export default principalRoute(['POST'], async (req, res, { session, principal, ipHash, userAgent, actor }) => {
  const { language, ...body } = req.body || {};
  const parsed = eraseSchema.safeParse(body);
  const lang = languageSchema.safeParse(language);
  if (!parsed.success || !lang.success) return res.status(400).json(withContact({ error: 'Please confirm the erasure.' }));

  const result = await prisma.$transaction(async (tx) => {
    const notice = await ensureNoticeVersion(tx, lang.data);
    const outcome = await erasePrincipal(tx, principal, { noticeVersionId: notice.id, language: lang.data, ipHash, userAgent });
    await recordRequest(tx, {
      principal,
      type: 'ERASURE',
      method: verificationMethod(session),
      status: outcome.fullyErased ? 'COMPLETED' : 'PARTIALLY_COMPLETED',
      response: { ...outcome, noticeVersion: NOTICE_VERSION }
    });
    await audit({ actor, action: 'DELETE', entity: 'DataPrincipal', entityId: principal.id, ipHash, detail: outcome.fullyErased ? 'full' : 'partial' }, tx);
    return outcome;
  });

  await instructProcessors('ERASE', { referenceId: principal.referenceId, processors: ['sms', 'email'] });

  if (result.fullyErased) {
    endSession(res);
    return res.status(200).json(withContact({ ok: true, result }));
  }
  res.status(200).json(withContact({ ok: true, result, summary: buildSummary(await loadPrincipal(principal.id)) }));
});
