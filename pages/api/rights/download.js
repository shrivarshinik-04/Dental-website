/**
 * s.11: machine-readable copy of the Data Principal's data (JSON download).
 * Logged as an ACCESS request and audited as an EXPORT.
 */
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { principalRoute } from 'lib/rightsApi';
import { buildSummary, recordRequest, verificationMethod, withContact } from 'lib/rights';

export default principalRoute(['GET'], async (req, res, { session, principal, ipHash, actor }) => {
  const summary = buildSummary(principal);
  await prisma.$transaction(async (tx) => {
    await recordRequest(tx, { principal, type: 'ACCESS', method: verificationMethod(session), response: { delivered: 'json-download' } });
    await audit({ actor, action: 'EXPORT', entity: 'DataPrincipal', entityId: principal.id, ipHash }, tx);
  });
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="my-data-${principal.referenceId}.json"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(JSON.stringify(withContact({ generatedAt: new Date().toISOString(), ...summary }), null, 2));
});
