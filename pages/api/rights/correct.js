/**
 * Correction, completion and updating of personal data, including the parent or guardian's
 * details on bookings for a patient under 18.
 * Legal mapping: SPDI Rules 2011 Rule 5(6) (now); DPDP Act s.12(1)–(2) (from about May 2027).
 */
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { encrypt } from 'lib/crypto';
import { correctionSchema, fieldErrors } from 'lib/validation';
import { principalRoute } from 'lib/rightsApi';
import { buildSummary, isMinorOnly, loadPrincipal, recordRequest, verificationMethod, withContact } from 'lib/rights';

const PERSON_FIELDS = ['name', 'phone', 'email'];
const GUARDIAN_FIELDS = ['guardianName', 'guardianPhone', 'guardianEmail'];

export default principalRoute(['POST'], async (req, res, { session, principal, ipHash, actor }) => {
  const parsed = correctionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) }));

  const { type, ...fields } = parsed.data;
  const pick = (keys) => Object.fromEntries(keys.filter((k) => fields[k] !== undefined).map((k) => [k, encrypt(fields[k])]));
  const personChanges = pick(PERSON_FIELDS);
  const guardianChanges = pick(GUARDIAN_FIELDS);
  const minorBookings = principal.appointments.filter((a) => a.patientIsMinor).map((a) => a.id);
  const changed = [...Object.keys(personChanges), ...Object.keys(guardianChanges)];

  if (!changed.length) return res.status(400).json(withContact({ error: 'Nothing to change.' }));
  if (personChanges.phone === null) return res.status(400).json(withContact({ error: 'A mobile number is required.' }));
  // For a patient under 18 we keep the guardian's contact details, never the patient's own.
  if (isMinorOnly(principal) && ('phone' in personChanges || 'email' in personChanges))
    return res
      .status(400)
      .json(withContact({ error: "For a patient under 18 we keep the parent or guardian's contact details instead.", fields: ['phone', 'email'] }));
  if (Object.keys(guardianChanges).length && !minorBookings.length)
    return res.status(400).json(withContact({ error: 'There are no bookings for a patient under 18 on this record.' }));
  if (guardianChanges.guardianPhone === null) return res.status(400).json(withContact({ error: "The guardian's mobile number is required." }));

  await prisma.$transaction(async (tx) => {
    if (Object.keys(personChanges).length) await tx.dataPrincipal.update({ where: { id: principal.id }, data: personChanges });
    if (Object.keys(guardianChanges).length)
      await tx.appointment.updateMany({ where: { id: { in: minorBookings } }, data: guardianChanges });
    // Store which fields changed, not their values.
    await recordRequest(tx, { principal, type, method: verificationMethod(session), payload: { fields: changed } });
    await audit({ actor, action: 'UPDATE', entity: 'DataPrincipal', entityId: principal.id, ipHash, detail: changed.join(',') }, tx);
  });

  res.status(200).json(withContact({ ok: true, summary: buildSummary(await loadPrincipal(principal.id)) }));
});
