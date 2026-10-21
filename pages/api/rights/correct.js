/**
 * s.12(1)–(2) right to correction, completion and updating of personal data.
 */
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { encrypt } from 'lib/crypto';
import { correctionSchema, fieldErrors } from 'lib/validation';
import { principalRoute } from 'lib/rightsApi';
import { buildSummary, loadPrincipal, recordRequest, verificationMethod, withContact } from 'lib/rights';

export default principalRoute(['POST'], async (req, res, { session, principal, ipHash, actor }) => {
  const parsed = correctionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(withContact({ error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) }));

  const { type, ...fields } = parsed.data;
  const changes = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encrypt(v)]));
  if (!Object.keys(changes).length) return res.status(400).json(withContact({ error: 'Nothing to change.' }));
  if (changes.phone === null) return res.status(400).json(withContact({ error: 'A mobile number is required.' }));

  await prisma.$transaction(async (tx) => {
    await tx.dataPrincipal.update({ where: { id: principal.id }, data: changes });
    // Store which fields changed, not their values.
    await recordRequest(tx, { principal, type, method: verificationMethod(session), payload: { fields: Object.keys(changes) } });
    await audit({ actor, action: 'UPDATE', entity: 'DataPrincipal', entityId: principal.id, ipHash, detail: Object.keys(changes).join(',') }, tx);
  });

  res.status(200).json(withContact({ ok: true, summary: buildSummary(await loadPrincipal(principal.id)) }));
});
