/**
 * Reports whether the browser holds a valid rights-portal session (Rule 14(1)),
 * without reading any personal data.
 */
import prisma from 'lib/db';
import { allowMethods, withErrors } from 'lib/http';
import { readSession } from 'lib/rightsSession';

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  const session = readSession(req);
  const principal =
    session &&
    (await prisma.dataPrincipal.findUnique({
      where: { id: session.dataPrincipalId },
      select: { referenceId: true, erasedAt: true }
    }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(principal && !principal.erasedAt ? { verified: true, referenceId: principal.referenceId } : { verified: false });
});
