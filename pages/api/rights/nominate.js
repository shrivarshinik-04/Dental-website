/**
 * s.14 + DPDP Rules 2025, Rule 14(4): nominate a person to exercise the Data
 * Principal's rights in the event of death or incapacity. Replaces any earlier nominee.
 */
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { encrypt } from 'lib/crypto';
import { fieldErrors, nominationSchema } from 'lib/validation';
import { principalRoute } from 'lib/rightsApi';
import { buildSummary, loadPrincipal, recordRequest, verificationMethod, withContact } from 'lib/rights';

export default principalRoute(['POST'], async (req, res, { session, principal, ipHash, actor }) => {
  const parsed = nominationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) }));
  const { name, relationship, contact } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.nomination.updateMany({ where: { dataPrincipalId: principal.id, active: true }, data: { active: false } });
    const nomination = await tx.nomination.create({
      data: {
        dataPrincipalId: principal.id,
        nomineeName: encrypt(name),
        relationship: encrypt(relationship),
        contact: encrypt(contact.value)
      }
    });
    await recordRequest(tx, { principal, type: 'NOMINATION', method: verificationMethod(session), payload: { nominationId: nomination.id } });
    await audit({ actor, action: 'CREATE', entity: 'Nomination', entityId: nomination.id, ipHash }, tx);
  });

  res.status(200).json(withContact({ ok: true, summary: buildSummary(await loadPrincipal(principal.id)) }));
});
