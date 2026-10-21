/**
 * Appointment booking (collection point A).
 * DPDP Act s.4 + s.6 (consent per purpose, nothing bundled), s.5 (notice shown with
 * the form), s.6(10) (consent ledger with notice version), s.8(5) + Rule 6 (encryption,
 * validation, rate limiting, audit log), s.9 + Rule 12 / Fourth Schedule Part A item 1
 * (children).
 *
 * Children: a clinical establishment providing health services to a child is exempt
 * from s.9(1) (verifiable parental consent) and s.9(3) (tracking / targeted ads) only
 * "to the extent necessary for the protection of their health". So for minors we
 * collect only what the appointment needs, record consent as given by the parent or
 * guardian (with their declaration), never record marketing consent and never send
 * marketing. The browser side keeps analytics/marketing off for the session.
 */
import { NOTICE_VERSION } from 'config/compliance';
import prisma from 'lib/db';
import { auditMany } from 'lib/audit';
import { encrypt, randomReference } from 'lib/crypto';
import { ensureNoticeVersion } from 'lib/noticeContent';
import { appointmentSchema, fieldErrors } from 'lib/validation';
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, userAgent, withErrors } from 'lib/http';
import { services } from '../../src/data';

const SERVICE_TITLES = services.map((s) => s.title);
const MAX_DAYS_AHEAD = 180;

// YYYY-MM-DD in IST, independent of the server's timezone.
const dateInIndia = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);

const uniqueReference = async (tx) => {
  for (let i = 0; i < 5; i += 1) {
    const candidate = randomReference('DP');
    if (!(await tx.dataPrincipal.findUnique({ where: { referenceId: candidate }, select: { id: true } }))) return candidate;
  }
  throw new Error('Could not allocate a reference ID');
};

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!rateLimit(req, res, { key: 'appointments', limit: 5, windowMs: 15 * 60 * 1000 })) return;

  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) });
  const data = parsed.data;

  if (data.noticeVersion !== NOTICE_VERSION) return res.status(409).json({ error: 'The notice has changed. Please reload the page.' });
  if (!SERVICE_TITLES.includes(data.service)) return res.status(400).json({ error: 'Please choose a service.', fields: ['service'] });
  const maxDate = dateInIndia(new Date(Date.now() + MAX_DAYS_AHEAD * 86400000));
  if (data.preferredDate < dateInIndia(new Date()) || data.preferredDate > maxDate)
    return res.status(400).json({ error: 'Please choose a date from today onwards.', fields: ['preferredDate'] });

  const isMinor = data.isMinor;
  const ipHash = hashedIp(req);
  const ua = userAgent(req);

  const referenceId = await prisma.$transaction(async (tx) => {
    const notice = await ensureNoticeVersion(tx, data.language);
    const reference = await uniqueReference(tx);

    const principal = await tx.dataPrincipal.create({
      data: {
        referenceId: reference,
        name: encrypt(data.name),
        phone: encrypt(data.phone),
        email: encrypt(data.email)
      }
    });

    const appointment = await tx.appointment.create({
      data: {
        dataPrincipalId: principal.id,
        preferredDate: new Date(`${data.preferredDate}T00:00:00+05:30`),
        preferredSlot: data.preferredSlot,
        service: encrypt(data.service),
        notes: encrypt(data.reason),
        patientIsMinor: isMinor,
        guardianName: isMinor ? encrypt(data.guardianName) : null,
        guardianRelationship: isMinor ? encrypt(data.guardianRelationship) : null
      }
    });

    // One row per purpose: required + each optional purpose, never bundled (s.6(1)).
    const purposes = [
      ['APPOINTMENT', true],
      ['APPOINTMENT_REMINDERS_SMS_WHATSAPP', data.consents.APPOINTMENT_REMINDERS_SMS_WHATSAPP],
      // Marketing is not offered for children, so nothing is recorded for it (s.9(3)).
      ...(isMinor ? [] : [['MARKETING', data.consents.MARKETING]])
    ];
    await tx.consentRecord.createMany({
      data: purposes.map(([purpose, given]) => ({
        dataPrincipalId: principal.id,
        purpose,
        status: given ? 'GIVEN' : 'DENIED',
        noticeVersionId: notice.id,
        language: data.language,
        channel: 'APPOINTMENT_FORM',
        givenByGuardian: isMinor,
        ipHash,
        userAgent: ua
      }))
    });

    await auditMany(
      [
        { entity: 'DataPrincipal', entityId: principal.id },
        { entity: 'Appointment', entityId: appointment.id },
        { entity: 'ConsentRecord', entityId: principal.id, detail: purposes.map(([p, g]) => `${p}=${g ? 'GIVEN' : 'DENIED'}`).join(',') }
      ].map((e) => ({ ...e, actor: 'public', action: 'CREATE', ipHash })),
      tx
    );

    return reference;
  });

  res.status(201).json({ referenceId });
});
