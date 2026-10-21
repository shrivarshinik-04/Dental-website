import { useState } from 'react';
import { useT } from 'lib/i18n';
import { postJson } from 'lib/api';

/**
 * Two-step identity check before acting on a rights request or grievance.
 * DPDP Rules 2025, Rule 14(1) and 14(5): the Data Principal gives the identifier we
 * issued (reference ID) and proves control of the registered phone or email with a
 * one-time code.
 */
const VerifyIdentity = ({ onVerified }) => {
  const { t } = useT();
  const [step, setStep] = useState('request');
  const [referenceId, setReferenceId] = useState('');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await postJson('/api/rights/request-otp', { referenceId, contact });
      setDemoCode(data.demo?.code || '');
      setStep('verify');
    });
  };

  const verifyCode = (e) => {
    e.preventDefault();
    run(async () => {
      await postJson('/api/rights/verify-otp', { referenceId, code });
      onVerified();
    });
  };

  return (
    <div className="border rounded p-4 bg-white lato">
      <h2 className="fs-22 merriweather text-title">{t('rights.verifyHeading')}</h2>
      {step === 'request' ? (
        <form onSubmit={requestCode} noValidate>
          <div className="mb-3">
            <label htmlFor="verify-reference" className="form-label">
              {t('rights.referenceId')}
            </label>
            <input
              id="verify-reference"
              className="form-control"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
              autoComplete="off"
              required
              maxLength={9}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="verify-contact" className="form-label">
              {t('rights.contact')}
            </label>
            <input
              id="verify-contact"
              className="form-control"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              maxLength={254}
              aria-describedby="verify-contact-hint"
            />
            <div id="verify-contact-hint" className="form-text">
              {t('rights.contactHint')}
            </div>
          </div>
          <button type="submit" className="btn bg-theme-dark text-white rounded" disabled={busy}>
            {busy ? t('common.loading') : t('rights.sendCode')}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} noValidate>
          <p className="fs-15" role="status">
            {t('rights.codeSent')}
          </p>
          {demoCode && (
            <div className="alert alert-warning py-2" role="note">
              <span className="badge bg-warning text-dark me-2">{t('rights.demoLabel')}</span>
              {t('rights.demoText')} <strong className="fs-18 ms-1">{demoCode}</strong>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="verify-code" className="form-label">
              {t('rights.code')}
            </label>
            <input
              id="verify-code"
              className="form-control"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
          <button type="submit" className="btn bg-theme-dark text-white rounded me-2" disabled={busy}>
            {busy ? t('common.loading') : t('rights.verify')}
          </button>
          <button type="button" className="btn btn-white border text-title rounded" onClick={() => setStep('request')}>
            {t('common.cancel')}
          </button>
        </form>
      )}
      {error && (
        <p className="text-danger mt-3 mb-0" role="alert">
          {error}
        </p>
      )}
      <p className="fs-14 text-muted mt-3 mb-0">{t('rights.lostReference')}</p>
    </div>
  );
};

export default VerifyIdentity;
