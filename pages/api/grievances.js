/**
 * Grievance redressal. Now: SPDI Rules 2011, Rule 5(9) — the Grievance Officer redresses
 * grievances within one month. From about May 2027: DPDP Act s.13 and Rules, Rule 14(3)
 * (published period of at most 90 days); s.13(3) Board complaint after this mechanism.
 *
 * Verified complainants (OTP session from /data-rights) are linked to their record.
 * People without a reference ID can still complain; we then keep their name and
 * contact (encrypted) only to reply.
 */
import { DATA_PROTECTION_BOARD, GRIEVANCE_RESPONSE_DAYS, MAX_GRIEVANCE_DAYS } from 'config/compliance';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { encrypt, randomReference } from 'lib/crypto';
import { alertContactPerson } from 'lib/notify';
import { readSession } from 'lib/rightsSession';
import { withContact } from 'lib/rights';
import { contact as contactSchema, fieldErrors, grievanceSchema } from 'lib/validation';
import { grievanceDueDate } from 'lib/deadlines';
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, withErrors } from 'lib/http';

const escalationNote = (dueDate) =>
  `If you are not satisfied with our response, or do not receive one by ${dueDate.toISOString().slice(0, 10)}, ` +
  'please contact the Grievance Officer again. From about 13 May 2027 (date to be confirmed), section 13(3) of the ' +
  `Digital Personal Data Protection Act, 2023 is expected to let you complain to the ${DATA_PROTECTION_BOARD.name} ` +
  `(${DATA_PROTECTION_BOARD.url || DATA_PROTECTION_BOARD.urlPendingText}) after using this grievance process.`;

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  if (!(await rateLimit(req, res, { key: 'grievance', limit: 5, windowMs: 60 * 60 * 1000 }))) return;

  const parsed = grievanceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) }));
  const data = parsed.data;

  const session = readSession(req);
  const principal = session && (await prisma.dataPrincipal.findUnique({ where: { id: session.dataPrincipalId } }));

  let contactDetail = null;
  if (!principal) {
    const contact = contactSchema.safeParse(data.contactDetail);
    if (!data.name || !contact.success)
      return res.status(400).json(withContact({ error: 'Please give your name and a mobile number or email for our reply.', fields: ['name', 'contactDetail'] }));
    contactDetail = contact.data.value;
  }

  // Earlier of the configured period and one calendar month (SPDI Rules 2011, Rule 5(9)).
  const dueDate = grievanceDueDate(new Date(), Math.min(GRIEVANCE_RESPONSE_DAYS, MAX_GRIEVANCE_DAYS));
  const ipHash = hashedIp(req);

  const grievance = await prisma.$transaction(async (tx) => {
    let referenceNumber;
    for (let i = 0; i < 5 && !referenceNumber; i += 1) {
      const candidate = randomReference('GRV', 8);
      if (!(await tx.grievance.findUnique({ where: { referenceNumber: candidate }, select: { id: true } }))) referenceNumber = candidate;
    }
    const created = await tx.grievance.create({
      data: {
        referenceNumber,
        dataPrincipalId: principal?.id || null,
        verified: Boolean(principal),
        contactName: principal ? null : encrypt(data.name),
        contactDetail: principal ? null : encrypt(contactDetail),
        category: data.category,
        description: encrypt(data.description),
        dueDate,
        escalationNote: escalationNote(dueDate)
      }
    });
    await audit(
      {
        actor: principal ? `data-principal:${principal.referenceId}` : 'public',
        action: 'CREATE',
        entity: 'Grievance',
        entityId: created.id,
        ipHash
      },
      tx
    );
    return created;
  });

  await alertContactPerson(`New grievance ${grievance.referenceNumber} (${data.category}), due ${dueDate.toISOString().slice(0, 10)}`);

  res.status(201).json(
    withContact({
      referenceNumber: grievance.referenceNumber,
      dueDate: grievance.dueDate.toISOString(),
      verified: grievance.verified,
      escalationNote: grievance.escalationNote
    })
  );
});
