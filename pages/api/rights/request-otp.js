/**
 * Step 1 of identity verification for rights requests (DPDP Rules 2025, Rule 14(1), 14(5)).
 * Sends a one-time code to the registered phone or email if the reference ID and
 * contact match. The reply is the same either way, so it reveals nothing.
 */
import crypto from 'crypto';
import { OTP } from 'config/compliance';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { decrypt, hmac, safeEqual } from 'lib/crypto';
import { sendOtp } from 'lib/notify';
import { requestOtpSchema } from 'lib/validation';
import { withContact } from 'lib/rights';
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, withErrors } from 'lib/http';

const MAX_CODES_PER_WINDOW = 3;

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!rateLimit(req, res, { key: 'otp-request', limit: 5, windowMs: 15 * 60 * 1000 })) return;

  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Enter your reference ID and a valid mobile number or email.' }));

  const { referenceId, contact } = parsed.data;
  const principal = await prisma.dataPrincipal.findUnique({ where: { referenceId } });

  if (principal && !principal.erasedAt) {
    const stored = decrypt(contact.channel === 'phone' ? principal.phone : principal.email);
    if (stored && safeEqual(stored.toLowerCase(), contact.value.toLowerCase())) {
      const recent = await prisma.otpChallenge.count({
        where: { dataPrincipalId: principal.id, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } }
      });
      if (recent < MAX_CODES_PER_WINDOW) {
        const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        const challenge = await prisma.otpChallenge.create({
          data: {
            dataPrincipalId: principal.id,
            channel: contact.channel,
            codeHash: hmac(`${principal.id}:${code}`, 'SESSION_SECRET'),
            expiresAt: new Date(Date.now() + OTP.ttlMinutes * 60 * 1000)
          }
        });
        await sendOtp(contact.channel, contact.value, code);
        await audit({ actor: 'public', action: 'OTP_SENT', entity: 'OtpChallenge', entityId: challenge.id, ipHash: hashedIp(req) });
      }
    }
  }

  res.status(200).json(withContact({ ok: true }));
});
