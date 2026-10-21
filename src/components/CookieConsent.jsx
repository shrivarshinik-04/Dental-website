import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, useConsent } from 'lib/consentStore';
import { useT } from 'lib/i18n';
import ConsentNotice from 'components/ConsentNotice';
import LanguageSwitcher from 'components/LanguageSwitcher';

/**
 * Cookie banner for the two optional categories: functional (language) and analytics
 * (the first-party page-view counter in /public/js/analytics.js). Notice shown with the
 * request, one choice per category, nothing pre-ticked, "Reject all" as prominent as
 * "Accept all", re-opened from "Cookie settings" in the footer; withdrawal deletes the
 * cookies and the analytics data at once.
 * Not a cookie wall: it sits below the mobile menu and the page reserves space for it, so
 * every link and the footer stay usable.
 */
const CookieConsent = () => {
  const { ready, bannerOpen, choices, record, minorSession, saveChoices, closeBanner } = useConsent();
  const { t, language } = useT();
  const [customising, setCustomising] = useState(false);
  const [draft, setDraft] = useState(choices);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  // Reserve space at the bottom of the page while the banner is open, so it never covers
  // the footer (Cookie settings, contact details).
  useEffect(() => {
    if (!ready || !bannerOpen || !ref.current) return undefined;
    // The theme gives <body> a fixed height, so pad the Next.js root, whose height follows
    // the content.
    const root = document.getElementById('__next') || document.body;
    const update = () => {
      root.style.paddingBottom = `${ref.current ? ref.current.offsetHeight : 0}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      root.style.paddingBottom = '';
    };
  }, [ready, bannerOpen]);

  // Opened from the footer after a choice was made: go straight to the detailed view.
  useEffect(() => {
    if (bannerOpen) {
      setDraft(choices);
      setCustomising(Boolean(record));
      setError('');
    }
  }, [bannerOpen, choices, record]);

  if (!ready || !bannerOpen) return null;

  const submit = async (next) => {
    setSaving(true);
    setError('');
    try {
      // A child's booking session never records consent to analytics.
      await saveChoices(minorSession ? { ...next, analytics: false } : next, language);
    } catch {
      setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const all = (value) => Object.fromEntries(CATEGORIES.map((c) => [c, value]));
  const trackingLocked = (category) => minorSession && category !== 'functional';

  return (
    <div
      ref={ref}
      className="position-fixed bottom-0 start-0 end-0 p-2 p-md-3 cookie-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      <div className="container">
        <div className="card shadow-lg border lato cookie-banner-card">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <h2 id="cookie-consent-title" className="fs-22 merriweather text-title mb-0">
                {t('cookie.title')}
              </h2>
              <div className="d-flex align-items-center gap-3">
                <LanguageSwitcher />
                {record && (
                  <button type="button" className="btn-close" aria-label={t('common.cancel')} onClick={closeBanner} />
                )}
              </div>
            </div>

            <p className="fs-15 mb-2">{t('cookie.text')}</p>
            {minorSession && <p className="fs-15 alert alert-info py-2 mb-2">{t('cookie.minorNote')}</p>}

            <details className="mb-3 fs-15">
              <summary className="text-title">{t('notice.title')}</summary>
              <ConsentNotice
                idPrefix="cookie-notice"
                className="mt-2"
                headingLevel={3}
                showSwitcher={false}
                dataKeys={['cookieId', 'cookieChoices', 'consentProof', 'analyticsData']}
                purposeKeys={['FUNCTIONAL_COOKIES', 'ANALYTICS_COOKIES']}
              />
            </details>

            {customising && (
              <fieldset className="mb-3">
                <legend className="visually-hidden">{t('cookie.customise')}</legend>
                <div className="border rounded p-3 mb-2">
                  <div className="form-check form-switch consent-switch">
                    <input className="form-check-input" type="checkbox" role="switch" id="cookie-necessary" checked disabled />
                    <label className="form-check-label fw-bold" htmlFor="cookie-necessary">
                      {t('cookie.categories.necessary.title')} ({t('cookie.alwaysOn')})
                    </label>
                  </div>
                  <p className="fs-14 mb-0 mt-1">{t('cookie.categories.necessary.description')}</p>
                </div>
                {CATEGORIES.map((category) => (
                  <div className="border rounded p-3 mb-2" key={category}>
                    <div className="form-check form-switch consent-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id={`cookie-${category}`}
                        checked={Boolean(draft[category]) && !trackingLocked(category)}
                        disabled={trackingLocked(category)}
                        onChange={(e) => setDraft({ ...draft, [category]: e.target.checked })}
                      />
                      <label className="form-check-label fw-bold" htmlFor={`cookie-${category}`}>
                        {t(`cookie.categories.${category}.title`)}
                      </label>
                    </div>
                    <p className="fs-14 mb-0 mt-1">{t(`cookie.categories.${category}.description`)}</p>
                  </div>
                ))}
              </fieldset>
            )}

            {error && (
              <p className="text-danger fs-15" role="alert">
                {error}
              </p>
            )}

            <div className="d-flex flex-wrap gap-2 align-items-center">
              {/* Accept and Reject share the same class: equal prominence, no nudging. */}
              <button
                type="button"
                className="btn bg-theme-dark text-white rounded"
                disabled={saving}
                onClick={() => submit(all(true))}
              >
                {t('cookie.acceptAll')}
              </button>
              <button
                type="button"
                className="btn bg-theme-dark text-white rounded"
                disabled={saving}
                onClick={() => submit(all(false))}
              >
                {t('cookie.rejectAll')}
              </button>
              {customising ? (
                <button
                  type="button"
                  className="btn btn-white border text-title rounded"
                  disabled={saving}
                  onClick={() => submit(draft)}
                >
                  {t('cookie.save')}
                </button>
              ) : (
                <button type="button" className="btn btn-white border text-title rounded" onClick={() => setCustomising(true)}>
                  {t('cookie.customise')}
                </button>
              )}
              <Link href="/cookie-policy" className="ms-md-auto fs-15">
                {t('notice.links.cookies')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
