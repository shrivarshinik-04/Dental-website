/**
 * Step 2 of identity verification (DPDP Rules 2025, Rule 14(1)). On a correct code,
 * starts a 15-minute session for the rights portal.
 */
import { OTP } from 'config/compliance';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { keyedHash, safeEqual } from 'lib/crypto';
import { startSession } from 'lib/rightsSession';
import { verifyOtpSchema } from 'lib/validation';
import { withContact } from 'lib/rights';
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, withErrors } from 'lib/http';

const INVALID = 'That code is not valid or has expired. Request a new one.';

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!(await rateLimit(req, res, { key: 'otp-verify', limit: 10, windowMs: 15 * 60 * 1000 }))) return;

  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: INVALID }));

  const principal = await prisma.dataPrincipal.findUnique({ where: { referenceId: parsed.data.referenceId } });
  const challenge =
    principal &&
    (await prisma.otpChallenge.findFirst({
      where: { dataPrincipalId: principal.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    }));
  if (!challenge || challenge.attempts >= OTP.maxAttempts) return res.status(400).json(withContact({ error: INVALID }));

  const ipHash = hashedIp(req);
  if (!safeEqual(keyedHash(`${principal.id}:${parsed.data.code}`, 'otp'), challenge.codeHash)) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    await audit({ actor: 'public', action: 'OTP_FAILED', entity: 'OtpChallenge', entityId: challenge.id, ipHash });
    return res.status(400).json(withContact({ error: INVALID }));
  }

  await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
  startSession(res, { dataPrincipalId: principal.id, channel: challenge.channel });
  await audit({
    actor: `data-principal:${principal.referenceId}`,
    action: 'VERIFIED',
    entity: 'DataPrincipal',
    entityId: principal.id,
    ipHash
  });
  res.status(200).json(withContact({ ok: true }));
});
