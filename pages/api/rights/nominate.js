/**
 * Nomination of a person to exercise the Data Principal's rights on death or incapacity
 * (DPDP Act s.14, DPDP Rules 2025 Rule 14(4): from about May 2027). Stored as a NOMINATION
 * request with the nominee encrypted; the latest one replaces any earlier nominee.
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
    // The latest NOMINATION request is the current nominee; earlier ones are history.
    const request = await recordRequest(tx, {
      principal,
      type: 'NOMINATION',
      method: verificationMethod(session),
      payload: { nominee: encrypt(JSON.stringify({ name, relationship, contact: contact.value })) }
    });
    await audit({ actor, action: 'CREATE', entity: 'RightsRequest', entityId: request.id, ipHash, detail: 'NOMINATION' }, tx);
  });

  res.status(200).json(withContact({ ok: true, summary: buildSummary(await loadPrincipal(principal.id)) }));
});
