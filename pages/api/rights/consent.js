/**
 * s.6(4) one-click withdrawal (and re-granting) of consent per purpose from the
 * preference centre. s.6(6): on withdrawal we, and our Processors, stop processing
 * for that purpose. Appends to the ConsentRecord ledger, never updates it.
 */
import { NOTICE_VERSION } from 'config/compliance';
import prisma from 'lib/db';
import { auditMany } from 'lib/audit';
import { ensureNoticeVersion } from 'lib/noticeContent';
import { instructProcessors } from 'lib/notify';
import { consentChangeSchema } from 'lib/validation';
import { principalRoute } from 'lib/rightsApi';
import {
  buildSummary,
  currentConsents,
  hasMinorAppointments,
  loadPrincipal,
  recordRequest,
  verificationMethod,
  withContact
} from 'lib/rights';

const PROCESSORS_BY_PURPOSE = {
  APPOINTMENT: ['sms', 'email'],
  APPOINTMENT_REMINDERS_SMS_WHATSAPP: ['sms'],
  MARKETING: ['sms', 'email']
};

export default principalRoute(['POST'], async (req, res, { session, principal, ipHash, userAgent, actor }) => {
  const parsed = consentChangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Invalid request' }));
  const { purpose, action, language } = parsed.data;

  const latest = currentConsents(principal.consents)[purpose];
  const minor = hasMinorAppointments(principal);

  if (action === 'WITHDRAW' && latest?.status !== 'GIVEN')
    return res.status(400).json(withContact({ error: 'This consent is not currently given.' }));
  if (action === 'GIVE') {
    if (purpose === 'APPOINTMENT') return res.status(400).json(withContact({ error: 'To book again, please use the appointment form.' }));
    // Reminder and marketing purposes are no longer offered (no such process exists).
    return res.status(400).json(withContact({ error: 'This option is no longer offered.' }));
  }

  let cancelled = 0;
  await prisma.$transaction(async (tx) => {
    const notice = await ensureNoticeVersion(tx, language);
    const record = await tx.consentRecord.create({
      data: {
        dataPrincipalId: principal.id,
        purpose,
        status: action === 'WITHDRAW' ? 'WITHDRAWN' : 'GIVEN',
        noticeVersionId: notice.id,
        language,
        channel: 'PREFERENCE_CENTRE',
        givenByGuardian: minor,
        ipHash,
        userAgent
      }
    });

    // s.6(6): withdrawing the appointment purpose cancels pending bookings. Visits that
    // are part of the clinical record are kept (s.8(7)); the rest is erased by
    // scripts/retention.js.
    if (action === 'WITHDRAW' && purpose === 'APPOINTMENT') {
      ({ count: cancelled } = await tx.appointment.updateMany({
        where: { dataPrincipalId: principal.id, status: { in: ['REQUESTED', 'CONFIRMED'] }, legallyRequired: false },
        data: { status: 'CANCELLED' }
      }));
    }

    if (action === 'WITHDRAW') {
      await recordRequest(tx, {
        principal,
        type: 'WITHDRAW_CONSENT',
        method: verificationMethod(session),
        payload: { purpose },
        response: { withdrawn: purpose, noticeVersion: NOTICE_VERSION, appointmentsCancelled: cancelled }
      });
    }
    await auditMany(
      [
        { entity: 'ConsentRecord', entityId: record.id, detail: `${purpose}=${record.status}` },
        ...(cancelled ? [{ entity: 'Appointment', entityId: principal.id, detail: `cancelled=${cancelled}` }] : [])
      ].map((e) => ({ ...e, actor, action: 'CREATE', ipHash })),
      tx
    );
  });

  if (action === 'WITHDRAW') {
    await instructProcessors('STOP_PROCESSING', {
      referenceId: principal.referenceId,
      purpose,
      processors: PROCESSORS_BY_PURPOSE[purpose]
    });
  }

  res.status(200).json(withContact({ ok: true, summary: buildSummary(await loadPrincipal(principal.id)) }));
});
