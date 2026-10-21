/**
 * Client-side consent state for cookies and similar technologies.
 * DPDP Act s.6(1) (free, specific, informed, unambiguous consent by clear affirmative
 * action), s.6(4) (withdrawal as easy as giving), s.6(6) (stop processing on withdrawal),
 * s.9(2)–(3) (no tracking of children); Rule 3 (notice).
 *
 * - Every non-essential category is OFF until the visitor opts in.
 * - Choices are stored in the first-party `dpdp_consent` cookie (set by /api/consent,
 *   which also writes the ConsentRecord ledger) with the notice version and timestamp.
 * - A new NOTICE_VERSION re-opens the banner and treats all categories as off.
 * - Withdrawal deletes the category's cookies at once and reloads the page if a script
 *   for that category had already run (scripts cannot be unloaded).
 * - Third-party scripts load only through `loadScriptIfConsented`.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { COOKIES, NOTICE_VERSION, NO_TRACKING_PATHS } from 'config/compliance';
import { CATEGORIES } from './consentCategories';

export { CATEGORIES };
export const CONSENT_COOKIE = 'dpdp_consent';
// Never active during a child's booking session or on pages that collect health data.
const TRACKING_CATEGORIES = ['analytics'];
const MINOR_SESSION_KEY = 'dpdp_minor_session';

const NONE = { functional: false, analytics: false };

const readConsentCookie = () => {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)));
  } catch {
    return null;
  }
};

const deleteCookie = (name) => {
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  domains.forEach((domain) => {
    document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ''}`;
  });
};

/**
 * Asks the server to erase analytics events tied to this browser, then deletes the cookie.
 * Used whenever the analytics cookie is dropped outside a recorded withdrawal (which the
 * consent API handles itself), so no events are left orphaned.
 */
const eraseAnalyticsThenPurge = () =>
  fetch('/api/analytics', { method: 'DELETE', credentials: 'same-origin', keepalive: true })
    .catch(() => {})
    .finally(() => purgeCategory('analytics'));

/** Deletes every cookie registered for a category in COOKIES (prefix match). */
export const purgeCategory = (category) => {
  const prefixes = COOKIES.filter((c) => c.category === category && c.match).map((c) => c.match);
  if (!prefixes.length) return;
  document.cookie
    .split('; ')
    .map((c) => c.split('=')[0])
    .filter((name) => prefixes.some((p) => name.startsWith(p)))
    .forEach(deleteCookie);
};

// ---------------------------------------------------------------------------
// Module-level mirror of the current state so `loadScriptIfConsented` can be
// called from outside React.
// ---------------------------------------------------------------------------
let current = { choices: NONE, minorSession: false, blockedPath: true };
const loadedScripts = { functional: new Set(), analytics: new Set() };

const isAllowed = (state, category) => {
  if (!state.choices[category]) return false;
  if (TRACKING_CATEGORIES.includes(category) && (state.minorSession || state.blockedPath)) return false;
  return true;
};

/**
 * Injects a third-party script only if the visitor has opted in to `category`.
 * Resolves `false` (and loads nothing) otherwise.
 */
export const loadScriptIfConsented = (category, src) =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || !src || !isAllowed(current, category)) return resolve(false);
    if (loadedScripts[category].has(src)) return resolve(true);
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.consentCategory = category;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    loadedScripts[category].add(src);
    document.head.appendChild(script);
  });

const ConsentContext = createContext(null);

const isBlockedPath = (pathname) => NO_TRACKING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const ConsentProvider = ({ children }) => {
  const { pathname } = useRouter();
  const [ready, setReady] = useState(false);
  const [choices, setChoices] = useState(NONE);
  const [record, setRecord] = useState(null); // { version, timestamp }
  const [bannerOpen, setBannerOpen] = useState(false);
  const [minorSession, setMinorSessionState] = useState(false);

  useEffect(() => {
    const saved = readConsentCookie();
    if (saved && saved.v === NOTICE_VERSION && saved.c) {
      setChoices({ functional: Boolean(saved.c.functional), analytics: Boolean(saved.c.analytics) });
      setRecord({ version: saved.v, timestamp: saved.ts });
    } else {
      // No choice yet, or the notice changed since: ask again, everything off meanwhile.
      if (saved) {
        purgeCategory('functional');
        eraseAnalyticsThenPurge();
      }
      setBannerOpen(true);
    }
    try {
      setMinorSessionState(window.sessionStorage.getItem(MINOR_SESSION_KEY) === '1');
    } catch {
      // sessionStorage unavailable: stays false for this page view.
    }
    setReady(true);
  }, []);

  const blockedPath = isBlockedPath(pathname);
  // Updated during render (not in an effect) because children's effects, which may
  // call loadScriptIfConsented, run before this component's effects.
  current = { choices, minorSession, blockedPath };
  // Read by /public/js/analytics.js before every page view, so tracking stops at once on
  // no-tracking pages, in a child's booking session, or after withdrawal.
  if (typeof window !== 'undefined') window.__dpdpAnalyticsAllowed = isAllowed(current, 'analytics');

  /** Records a choice through /api/consent. Throws if it could not be recorded. */
  const saveChoices = useCallback(
    async (next, language) => {
      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices: next, language, noticeVersion: NOTICE_VERSION })
      });
      if (!response.ok) throw new Error('Could not save consent');
      const data = await response.json();

      const withdrawn = CATEGORIES.filter((c) => choices[c] && !next[c]);
      withdrawn.forEach(purgeCategory);
      setChoices(next);
      setRecord({ version: data.version, timestamp: data.timestamp });
      setBannerOpen(false);
      if (withdrawn.some((c) => loadedScripts[c].size > 0)) window.location.reload();
    },
    [choices]
  );

  /** Called by the booking form when the patient is a child. */
  const setMinorSession = useCallback((value) => {
    setMinorSessionState(value);
    try {
      if (value) window.sessionStorage.setItem(MINOR_SESSION_KEY, '1');
      else window.sessionStorage.removeItem(MINOR_SESSION_KEY);
    } catch {
      // ignore
    }
    // A child's booking session: erase any analytics recorded in this browser and stop.
    if (value) eraseAnalyticsThenPurge();
  }, []);

  // Tell the analytics script (if loaded) that a page has rendered, after `current` and
  // window.__dpdpAnalyticsAllowed reflect the new path.
  useEffect(() => {
    window.dispatchEvent(new Event('dpdp:pageview'));
  }, [pathname]);

  const value = useMemo(
    () => ({
      ready,
      choices,
      record,
      bannerOpen,
      minorSession,
      openBanner: () => setBannerOpen(true),
      closeBanner: () => setBannerOpen(false),
      saveChoices,
      setMinorSession,
      hasConsent: (category) => isAllowed({ choices, minorSession, blockedPath }, category)
    }),
    [ready, choices, record, bannerOpen, minorSession, blockedPath, saveChoices, setMinorSession]
  );

  return createElement(ConsentContext.Provider, { value }, children);
};

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useConsent must be used inside ConsentProvider');
  return context;
};
