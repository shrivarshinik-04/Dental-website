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
import { decrypt, encrypt, randomReference } from 'lib/crypto';
import { readSession } from 'lib/rightsSession';
import { contactsFor } from 'lib/rights';
import { ensureNoticeVersion } from 'lib/noticeContent';
import { appointmentSchema, fieldErrors } from 'lib/validation';
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, userAgent, withErrors } from 'lib/http';
import { services } from '../../src/data';

const SERVICE_TITLES = services.map((s) => s.title);
const MAX_DAYS_AHEAD = 180;

// YYYY-MM-DD in IST, independent of the server's timezone.
const dateInIndia = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);

const same = (a, b) => Boolean(a && b) && a.trim().toLowerCase() === b.trim().toLowerCase();

const verifiedMatch = async (req, data) => {
  const session = readSession(req);
  if (!session) return null;
  const principal = await prisma.dataPrincipal.findUnique({ where: { id: session.dataPrincipalId }, include: { appointments: true } });
  if (!principal || principal.erasedAt) return null;
  const nameMatches = same(decrypt(principal.name), data.name);
  // Adults match on their own contact; a child's booking matches on the guardian's contact.
  const offered = data.isMinor ? [data.guardianPhone, data.guardianEmail] : [data.phone, data.email];
  const contactMatches = contactsFor(principal).some((c) => offered.some((v) => same(c.value, v)));
  return nameMatches && contactMatches ? principal : null;
};

const uniqueReference = async (tx) => {
  for (let i = 0; i < 5; i += 1) {
    const candidate = randomReference('DP');
    if (!(await tx.dataPrincipal.findUnique({ where: { referenceId: candidate }, select: { id: true } }))) return candidate;
  }
  throw new Error('Could not allocate a reference ID');
};

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!(await rateLimit(req, res, { key: 'appointments', limit: 5, windowMs: 15 * 60 * 1000 }))) return;

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

  // Returning patient: reuse the existing record only when this browser has verified that
  // record with a one-time code AND the name and the phone or email match it. Never merge
  // on an unverified match (and a parent booking for a child with the same phone keeps
  // a separate record because the name differs).
  const existing = await verifiedMatch(req, data);

  const { referenceId, reused } = await prisma.$transaction(async (tx) => {
    const notice = await ensureNoticeVersion(tx, data.language);

    const principal = existing
      ? existing
      : await tx.dataPrincipal.create({
          data: {
            referenceId: await uniqueReference(tx),
            name: encrypt(data.name),
            // For a patient under 18 these are null: the guardian's contact is stored on the booking.
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
        // Already null for adults (discarded by the schema), encrypted for minors.
        guardianName: encrypt(data.guardianName),
        guardianRelationship: encrypt(data.guardianRelationship),
        guardianPhone: encrypt(data.guardianPhone),
        guardianEmail: encrypt(data.guardianEmail)
      }
    });

    // Only the appointment purpose is offered. Reminder and marketing consents were removed
    // because no reminder or marketing process exists (REQUIREMENTS §5: no decorative consent).
    const purposes = [['APPOINTMENT', true]];
    await tx.consentRecord.createMany({
      data: purposes.map(([purpose, given]) => ({
        dataPrincipalId: principal.id,
        purpose,
        status: given ? 'GIVEN' : 'DENIED',
        noticeVersionId: notice.id,
        language: data.language,
        channel: 'APPOINTMENT_FORM',
        givenByGuardian: isMinor,
        // Links the consent to the booking that holds the guardian's details.
        appointmentId: isMinor ? appointment.id : null,
        ipHash,
        userAgent: ua
      }))
    });

    await auditMany(
      [
        ...(existing ? [] : [{ entity: 'DataPrincipal', entityId: principal.id }]),
        { entity: 'Appointment', entityId: appointment.id, detail: existing ? 'returning patient (verified)' : undefined },
        { entity: 'ConsentRecord', entityId: principal.id, detail: purposes.map(([p, g]) => `${p}=${g ? 'GIVEN' : 'DENIED'}`).join(',') }
      ].map((e) => ({ ...e, actor: 'public', action: 'CREATE', ipHash })),
      tx
    );

    return { referenceId: principal.referenceId, reused: Boolean(existing) };
  });

  res.status(201).json({ referenceId, reused });
});
