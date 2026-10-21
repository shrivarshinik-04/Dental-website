/**
 * Step 1 of identity verification before acting on a request about a person's data
 * (SPDI Rules 2011, Rule 5(6), now; DPDP Rules 2025, Rule 14(1) and (5), from about May 2027).
 * Sends a one-time code to the registered phone or email if the reference ID and contact
 * match. Outside DEMO_MODE the reply is the same either way, so it reveals nothing.
 * In DEMO_MODE (test environments only) a matching request gets the code back for display.
 */
import crypto from 'crypto';
import { OTP } from 'config/compliance';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { keyedHash, safeEqual } from 'lib/crypto';
import { DeliveryUnavailableError, otpDelivery, sendOtp } from 'lib/notify';
import { requestOtpSchema } from 'lib/validation';
import { contactsFor, withContact } from 'lib/rights';
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, withErrors } from 'lib/http';

const MAX_CODES_PER_WINDOW = 3;

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!(await rateLimit(req, res, { key: 'otp-request', limit: 5, windowMs: 15 * 60 * 1000 }))) return;

  // Checked before any lookup so the answer does not depend on whether the details match.
  if (!otpDelivery()) {
    return res.status(503).json(
      withContact({ error: 'Online verification is not available yet. Please contact the Grievance Officer using the details below.' })
    );
  }

  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Enter your reference ID and a valid mobile number or email.' }));

  const { referenceId, contact } = parsed.data;
  const principal = await prisma.dataPrincipal.findUnique({ where: { referenceId }, include: { appointments: { include: { guardian: true } } } });
  let demoCode;

  if (principal && !principal.erasedAt) {
    // The person's own contact, or for a patient under 18 the parent or guardian's.
    const matches = contactsFor(principal).some(
      (c) => c.channel === contact.channel && safeEqual(c.value.toLowerCase(), contact.value.toLowerCase())
    );
    if (matches) {
      const recent = await prisma.otpChallenge.count({
        where: { dataPrincipalId: principal.id, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } }
      });
      if (recent < MAX_CODES_PER_WINDOW) {
        const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        // Send first: a code that could not be delivered must not leave a challenge behind.
        try {
          ({ demoCode } = await sendOtp(contact.channel, contact.value, code));
        } catch (err) {
          if (err instanceof DeliveryUnavailableError) {
            return res.status(503).json(withContact({ error: 'We could not send a code right now. Please try again later.' }));
          }
          throw err;
        }
        const challenge = await prisma.otpChallenge.create({
          data: {
            dataPrincipalId: principal.id,
            channel: contact.channel,
            codeHash: keyedHash(`${principal.id}:${code}`, 'otp'),
            expiresAt: new Date(Date.now() + OTP.ttlMinutes * 60 * 1000)
          }
        });
        await audit({ actor: 'public', action: 'OTP_SENT', entity: 'OtpChallenge', entityId: challenge.id, ipHash: hashedIp(req) });
      }
    }
  }

  res.status(200).json(withContact({ ok: true, ...(demoCode ? { demo: { code: demoCode } } : {}) }));
});
