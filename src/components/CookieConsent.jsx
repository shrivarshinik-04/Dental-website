import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, useConsent } from 'lib/consentStore';
import { useT } from 'lib/i18n';
import ConsentNotice from 'components/ConsentNotice';
import LanguageSwitcher from 'components/LanguageSwitcher';

/**
 * Cookie consent banner, collection point B.
 * DPDP Act s.5 + s.6(1): notice together with the request, separate choice per purpose,
 * nothing pre-ticked, clear affirmative action; s.6(4): withdrawal as easy as giving
 * (re-opened from "Cookie settings" in the footer). No cookie wall: the page stays usable.
 * "Reject all" has the same size and style as "Accept all".
 */
const CookieConsent = () => {
  const { ready, bannerOpen, choices, record, minorSession, saveChoices, closeBanner } = useConsent();
  const { t, language } = useT();
  const [customising, setCustomising] = useState(false);
  const [draft, setDraft] = useState(choices);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      // A child's session never records consent to tracking (s.9(3)).
      await saveChoices(minorSession ? { ...next, analytics: false, marketing: false } : next, language);
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
      className="position-fixed bottom-0 start-0 end-0 p-3"
      style={{ zIndex: 1080 }}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      <div className="container">
        <div className="card shadow-lg border lato" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <div className="card-body p-4">
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
                className="mt-2"
                headingLevel={3}
                showSwitcher={false}
                dataKeys={['cookieId', 'cookieChoices', 'consentProof']}
                purposeKeys={['FUNCTIONAL_COOKIES', 'ANALYTICS_COOKIES', 'MARKETING_COOKIES']}
              />
            </details>

            {customising && (
              <fieldset className="mb-3">
                <legend className="visually-hidden">{t('cookie.customise')}</legend>
                <div className="border rounded p-3 mb-2">
                  <div className="form-check form-switch consent-switch">
                    <input className="form-check-input" type="checkbox" id="cookie-necessary" checked disabled />
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
