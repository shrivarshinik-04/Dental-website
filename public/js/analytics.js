/*
 * First-party page-view counter (decision D1). Served from this site; never loaded by
 * the page itself: src/lib/consentStore.js injects it only after the visitor allows
 * "Analytics" in the cookie banner.
 *
 * Collects: a random visitor ID (cookie dc_vid), the page path without query string, the
 * referring site's origin (domain only) and the time. No IP address, user agent, form
 * contents or cross-site tracking.
 *
 * Before every page view it checks window.__dpdpAnalyticsAllowed, which the consent store
 * keeps false on pages that collect health or identity data, during a child's booking
 * session, and after withdrawal. The server also refuses events without current consent.
 */
(function () {
  if (window.__dcAnalyticsLoaded) return;
  window.__dcAnalyticsLoaded = true;

  var COOKIE = 'dc_vid';
  var MAX_AGE = 365 * 24 * 60 * 60;
  var lastPath = null;
  var first = true;

  function allowed() {
    return window.__dpdpAnalyticsAllowed === true;
  }

  function readId() {
    var match = document.cookie.split('; ').filter(function (c) {
      return c.indexOf(COOKIE + '=') === 0;
    })[0];
    return match ? match.slice(COOKIE.length + 1) : null;
  }

  function newId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function ensureId() {
    if (readId()) return;
    var secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE + '=' + newId() + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' + secure;
  }

  function referrerOrigin() {
    try {
      if (!document.referrer) return null;
      var origin = new URL(document.referrer).origin;
      return origin === window.location.origin ? null : origin;
    } catch (e) {
      return null;
    }
  }

  function pageView() {
    if (!allowed()) return;
    var path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    ensureId();
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      // The referring site only matters for the first page of the visit.
      body: JSON.stringify({ path: path, referrerOrigin: first ? referrerOrigin() : null })
    }).catch(function () {});
    first = false;
  }

  // Dispatched by the consent store after each client-side route change has rendered.
  window.addEventListener('dpdp:pageview', pageView);
  pageView();
})();
