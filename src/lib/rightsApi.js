/**
 * Wrapper for /api/rights/* endpoints that act for a verified Data Principal.
 * DPDP Rules 2025, Rule 14(1): act only after verifying identity (OTP session);
 * Rule 9: responses carry the contact person; Rule 6: rate limiting and CSRF checks.
 */
import { allowMethods, hashedIp, rateLimit, requireSameOrigin, userAgent, withErrors } from './http';
import { endSession, readSession } from './rightsSession';
import { loadPrincipal, withContact } from './rights';

export const principalRoute = (methods, handler) =>
  withErrors(async (req, res) => {
    if (!allowMethods(req, res, methods)) return;
    if (req.method !== 'GET' && !requireSameOrigin(req, res)) return;
    if (!rateLimit(req, res, { key: 'rights-action', limit: 60, windowMs: 15 * 60 * 1000 })) return;

    const session = readSession(req);
    const principal = session && (await loadPrincipal(session.dataPrincipalId));
    if (!principal || principal.erasedAt) {
      endSession(res);
      return res.status(401).json(withContact({ error: 'Please verify your identity again.' }));
    }

    await handler(req, res, {
      session,
      principal,
      ipHash: hashedIp(req),
      userAgent: userAgent(req),
      actor: `data-principal:${principal.referenceId}`
    });
  });
