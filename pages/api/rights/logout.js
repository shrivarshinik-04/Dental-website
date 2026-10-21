/**
 * Ends the rights-portal session (Rule 6 access control).
 */
import { allowMethods, requireSameOrigin, withErrors } from 'lib/http';
import { endSession } from 'lib/rightsSession';

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  endSession(res);
  res.status(200).json({ ok: true });
});
