/**
 * Grievance redressal. DPDP Act s.13 (grievance mechanism; s.13(3) Board after
 * exhausting it), s.15 (duty not to file false or frivolous complaints); DPDP Rules
 * 2025, Rule 14(3) (published response period, at most 90 days) and Rule 9.
 */
import { Fragment, useEffect, useState } from 'react';
import Head from 'next/head';
import { useT } from 'lib/i18n';
import { postJson } from 'lib/api';
import PageHeader from 'components/PageHeader';
import LanguageSwitcher from 'components/LanguageSwitcher';
import VerifyIdentity from 'components/VerifyIdentity';
import BoardLink from 'components/BoardLink';
import ContactBlock from 'components/ContactBlock';

const CATEGORIES = ['CONSENT', 'ACCESS', 'CORRECTION', 'SECURITY', 'OTHER'];

const Grievance = () => {
  const { t, language } = useT();
  const [mode, setMode] = useState('reference');
  const [verifiedRef, setVerifiedRef] = useState(null);
  const [form, setForm] = useState({ name: '', contactDetail: '', category: '', description: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkSession = () =>
    fetch('/api/rights/session')
      .then((r) => r.json())
      .then((s) => setVerifiedRef(s.verified ? s.referenceId : null))
      .catch(() => setVerifiedRef(null));

  useEffect(() => {
    checkSession();
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { category: form.category, description: form.description, language };
      if (!verifiedRef) Object.assign(body, { name: form.name, contactDetail: form.contactDetail });
      setResult(await postJson('/api/grievances', body));
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const showForm = verifiedRef || mode === 'noReference';

  return (
    <Fragment>
      <Head>
        <title>{`${t('grievance.title')} | Dental Clinic`}</title>
      </Head>
      <PageHeader title={t('grievance.title')} subtitle={t('grievance.intro')} />
      <section className="wrapper">
        <div className="container py-10 py-md-12">
          <div className="row justify-content-center">
            <div className="col-lg-9 col-xl-8 lato">
              <div className="d-flex justify-content-end mb-4">
                <LanguageSwitcher />
              </div>

              {result ? (
                <div className="alert alert-success p-4" role="status">
                  <h2 className="fs-22 merriweather mb-3">{t('grievance.successTitle')}</h2>
                  <p className="mb-1">
                    {t('grievance.referenceNumber')}: <strong className="fs-20">{result.referenceNumber}</strong>
                  </p>
                  <p className="mb-3">
                    {t('grievance.dueDate')}:{' '}
                    <strong>{new Date(result.dueDate).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'long' })}</strong>
                  </p>
                  <p className="fs-15 mb-2">{t('grievance.board')}</p>
                  <BoardLink className="fs-15" />
                </div>
              ) : (
                <Fragment>
                  {!verifiedRef && (
                    <div className="btn-group mb-4" role="group">
                      {['reference', 'noReference'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`btn ${mode === m ? 'bg-theme-dark text-white' : 'btn-white border text-title'}`}
                          aria-pressed={mode === m}
                          onClick={() => setMode(m)}
                        >
                          {t(m === 'reference' ? 'grievance.withReference' : 'grievance.withoutReference')}
                        </button>
                      ))}
                    </div>
                  )}

                  {!showForm && <VerifyIdentity onVerified={checkSession} />}

                  {showForm && (
                    <form onSubmit={submit} className="border rounded p-4 bg-white" noValidate>
                      {verifiedRef && (
                        <p className="fs-15">
                          {t('booking.referenceLabel')}: <strong>{verifiedRef}</strong>
                        </p>
                      )}
                      {!verifiedRef && (
                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label htmlFor="g-name" className="form-label">
                              {t('grievance.name')} *
                            </label>
                            <input id="g-name" className="form-control" value={form.name} onChange={set('name')} maxLength={100} required />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="g-contact" className="form-label">
                              {t('grievance.contactDetail')} *
                            </label>
                            <input
                              id="g-contact"
                              className="form-control"
                              value={form.contactDetail}
                              onChange={set('contactDetail')}
                              maxLength={254}
                              required
                            />
                          </div>
                        </div>
                      )}
                      <div className="mb-3">
                        <label htmlFor="g-category" className="form-label">
                          {t('grievance.category')} *
                        </label>
                        <select id="g-category" className="form-select" value={form.category} onChange={set('category')} required>
                          <option value="">—</option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {t(`grievance.categories.${c}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="g-description" className="form-label">
                          {t('grievance.description')} *
                        </label>
                        <textarea
                          id="g-description"
                          className="form-control"
                          rows={5}
                          maxLength={2000}
                          value={form.description}
                          onChange={set('description')}
                          aria-describedby="g-description-hint"
                          required
                        />
                        <div id="g-description-hint" className="form-text">
                          {t('grievance.descriptionHint')}
                        </div>
                      </div>
                      <p className="fs-14">{t('grievance.duty')}</p>
                      {error && (
                        <p className="text-danger" role="alert">
                          {error}
                        </p>
                      )}
                      <button
                        type="submit"
                        className="btn bg-theme-dark text-white rounded"
                        disabled={busy || !form.category || !form.description.trim()}
                      >
                        {busy ? t('common.loading') : t('grievance.submit')}
                      </button>
                    </form>
                  )}
                </Fragment>
              )}

              <div className="border rounded p-4 bg-grays mt-4">
                <ContactBlock />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fragment>
  );
};

export default Grievance;
