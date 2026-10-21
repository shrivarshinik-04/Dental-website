/**
 * s.11 right to access: summary of personal data, processing activities and the
 * Processors it is shared with. Logged as an ACCESS request (Rule 14) and audited.
 */
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { principalRoute } from 'lib/rightsApi';
import { buildSummary, recordRequest, verificationMethod, withContact } from 'lib/rights';

export default principalRoute(['GET'], async (req, res, { session, principal, ipHash, actor }) => {
  const summary = buildSummary(principal);
  await prisma.$transaction(async (tx) => {
    await recordRequest(tx, { principal, type: 'ACCESS', method: verificationMethod(session), response: { delivered: 'summary' } });
    await audit({ actor, action: 'READ', entity: 'DataPrincipal', entityId: principal.id, ipHash }, tx);
  });
  res.status(200).json(withContact({ summary }));
});
