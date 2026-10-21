import { useEffect } from 'react';
import { loadScriptIfConsented, useConsent } from 'lib/consentStore';

/**
 * Renders children (e.g. an embedded map or video) only after the visitor has opted
 * in to `category`. DPDP Act s.6(1): nothing non-essential runs before consent.
 */
const ConsentGate = ({ category, children, fallback = null }) => {
  const { ready, hasConsent } = useConsent();
  return ready && hasConsent(category) ? children : fallback;
};

/**
 * Loads a third-party script once the visitor has opted in to `category`.
 * With an empty `src` it does nothing (the default: no analytics are configured).
 */
export const ConsentedScript = ({ category, src }) => {
  const { ready, hasConsent } = useConsent();
  const allowed = ready && hasConsent(category);

  useEffect(() => {
    if (allowed && src) loadScriptIfConsented(category, src);
  }, [allowed, category, src]);

  return null;
};

export default ConsentGate;
