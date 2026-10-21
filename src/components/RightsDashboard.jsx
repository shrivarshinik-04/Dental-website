import { useState } from 'react';
import { useT } from 'lib/i18n';
import { postJson } from 'lib/api';

/**
 * Data Principal rights dashboard, shown after OTP verification.
 * DPDP Act s.11 (access summary, processing, Processors), s.12(2) (correct, complete,
 * update), s.12(3) (erasure, with legally required data retained and explained),
 * s.6(4) (one-click withdrawal per purpose), s.14 (nomination); DPDP Rules 2025,
 * Rule 14 and Rule 9 (contact person with every response).
 */

const STATUS_KEY = { GIVEN: 'statusGiven', WITHDRAWN: 'statusWithdrawn', DENIED: 'statusNotGiven', NOT_GIVEN: 'statusNotGiven' };

// Purposes no longer offered have no text in the current notice.
const purposeTitle = (t, purpose) => {
  const current = t(`notice.purposes.${purpose}.title`);
  return current === `notice.purposes.${purpose}.title` ? t(`rights.legacyPurposes.${purpose}`) : current;
};

const Section = ({ title, children }) => (
  <section className="border rounded p-4 bg-white mb-4">
    <h2 className="fs-20 merriweather text-title mb-3">{title}</h2>
    {children}
  </section>
);

const RightsDashboard = ({ summary, onSummary, onSignedOut }) => {
  const { t, language } = useT();
  const [message, setMessage] = useState(null); // { type, text, contact }
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({
    name: summary.personalData.name || '',
    phone: summary.personalData.phone || '',
    email: summary.personalData.email || ''
  });
  const [nominee, setNominee] = useState({ name: '', relationship: '', contact: '' });
  const [eraseConfirm, setEraseConfirm] = useState(false);
  const [erasure, setErasure] = useState(null);

  const run = async (url, body, after) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await postJson(url, body);
      if (data.summary) onSummary(data.summary);
      setMessage({ type: 'success', text: t('rights.done'), contact: data.contact });
      if (after) after(data);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message, contact: err.data?.contact });
    } finally {
      setBusy(false);
    }
  };

  const changeConsent = (purpose, action) => run('/api/rights/consent', { purpose, action, language });

  const saveProfile = (e) => {
    e.preventDefault();
    const changed = Object.fromEntries(
      Object.entries(profile).filter(([key, value]) => value.trim() !== (summary.personalData[key] || ''))
    );
    const type = Object.keys(changed).some((k) => !summary.personalData[k]) ? 'COMPLETION' : 'CORRECTION';
    run('/api/rights/correct', { type, ...changed });
  };

  const saveNominee = (e) => {
    e.preventDefault();
    run('/api/rights/nominate', nominee, () => setNominee({ name: '', relationship: '', contact: '' }));
  };

  const erase = () =>
    run('/api/rights/erase', { confirm: true, language }, (data) => {
      setErasure(data.result);
      if (data.result.fullyErased) onSignedOut(data.result);
    });

  const signOut = async () => {
    await postJson('/api/rights/logout', {}).catch(() => {});
    onSignedOut(null);
  };

  return (
    <div className="lato">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <p className="mb-0">
          {t('booking.referenceLabel')}: <strong>{summary.referenceId}</strong>
        </p>
        <button type="button" className="btn btn-sm btn-white border text-title rounded" onClick={signOut}>
          {t('rights.signOut')}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role={message.type === 'danger' ? 'alert' : 'status'}>
          <p className="mb-1">{message.text}</p>
          {message.contact && (
            <p className="fs-14 mb-0">
              {t('rights.contactFooter', {
                name: message.contact.name,
                designation: message.contact.designation,
                email: message.contact.email,
                phone: message.contact.phone
              })}
            </p>
          )}
        </div>
      )}

      {erasure && !erasure.fullyErased && (
        <Section title={t('rights.retainedHeading')}>
          <p className="mb-1">
            <strong>{t('rights.erasedHeading')}:</strong> {erasure.erased.contactDetails.join(', ')};{' '}
            {erasure.erased.appointments} × {t('rights.appointmentsHeading').toLowerCase()}
          </p>
          <p className="mb-1">{erasure.retained.reason}</p>
          <p className="fs-14 mb-0">
            <strong>{t('rights.legalBasis')}:</strong> {erasure.retained.legalBasis}
          </p>
        </Section>
      )}

      <Section title={t('rights.accessHeading')}>
        <p className="fs-15">{t('rights.accessIntro')}</p>
        <dl className="row mb-3">
          {['name', 'phone', 'email'].map((field) => (
            <div className="col-md-4" key={field}>
              <dt className="fs-14">{t(`rights.fields.${field}`)}</dt>
              <dd>{summary.personalData[field] || t('rights.noData')}</dd>
            </div>
          ))}
        </dl>
        <h3 className="fs-17 merriweather text-title">{t('rights.appointmentsHeading')}</h3>
        {summary.appointments.length ? (
          <div className="table-responsive">
            <table className="table table-sm fs-15">
              <tbody>
                {summary.appointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.preferredDate}</td>
                    <td>{t(`booking.slots.${a.preferredSlot}`)}</td>
                    <td>{a.service}</td>
                    <td>{a.reason}</td>
                    <td>{a.patientIsMinor ? `${a.guardianName} (${t(`booking.relationships.${a.guardianRelationship}`)})` : ''}</td>
                    <td>{a.status}</td>
                    <td>{a.legallyRequired ? t('rights.clinicalRecord') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t('rights.noData')}</p>
        )}
        <h3 className="fs-17 merriweather text-title mt-3">{t('rights.processingHeading')}</h3>
        <ul className="fs-15">
          {summary.processing.map((p) => (
            <li key={p.purpose}>
              {purposeTitle(t, p.purpose)}: {p.lawfulGround}
            </li>
          ))}
        </ul>
        <h3 className="fs-17 merriweather text-title mt-3">{t('rights.processorsHeading')}</h3>
        <ul className="fs-15 mb-0">
          {summary.processors.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong>: {p.purpose}.{' '}
              {p.configured ? `${p.dataShared}; ${p.location}` : t('rights.notConfigured')}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('rights.consentsHeading')}>
        <ul className="list-unstyled mb-0">
          {summary.consents.map((c) => (
            <li key={c.purpose} className="d-flex flex-wrap justify-content-between align-items-center border-bottom py-2 gap-2">
              <span>
                <strong>{purposeTitle(t, c.purpose)}</strong>
                <br />
                <span className="fs-14">
                  {t(`rights.${STATUS_KEY[c.status]}`)}
                  {c.at && ` · ${new Date(c.at).toLocaleString()}`}
                </span>
              </span>
              {c.status === 'GIVEN' ? (
                <button
                  type="button"
                  className="btn btn-sm bg-theme-dark text-white rounded"
                  disabled={busy}
                  onClick={() => changeConsent(c.purpose, 'WITHDRAW')}
                >
                  {t('rights.withdraw')}
                </button>
              ) : (
                c.purpose !== 'APPOINTMENT' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-white border text-title rounded"
                    disabled={busy}
                    onClick={() => changeConsent(c.purpose, 'GIVE')}
                  >
                    {t('rights.give')}
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('rights.correctHeading')}>
        <form onSubmit={saveProfile} className="row g-3" noValidate>
          {['name', 'phone', 'email'].map((field) => (
            <div className="col-md-4" key={field}>
              <label htmlFor={`profile-${field}`} className="form-label">
                {t(`rights.fields.${field}`)}
              </label>
              <input
                id={`profile-${field}`}
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                className="form-control"
                value={profile[field]}
                maxLength={field === 'email' ? 254 : 100}
                onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
              />
            </div>
          ))}
          <div className="col-12">
            <button type="submit" className="btn bg-theme-dark text-white rounded" disabled={busy}>
              {t('rights.save')}
            </button>
          </div>
        </form>
      </Section>

      <Section title={t('rights.nominateHeading')}>
        <p className="fs-15">{t('rights.nominateIntro')}</p>
        {summary.nominations.map((n) => (
          <p key={n.since} className="fs-15">
            <strong>{t('rights.currentNominee')}:</strong> {n.name} ({n.relationship}), {n.contact}
          </p>
        ))}
        <form onSubmit={saveNominee} className="row g-3" noValidate>
          {[
            ['name', 'nomineeName', 100],
            ['relationship', 'nomineeRelationship', 50],
            ['contact', 'nomineeContact', 254]
          ].map(([field, label, max]) => (
            <div className="col-md-4" key={field}>
              <label htmlFor={`nominee-${field}`} className="form-label">
                {t(`rights.${label}`)}
              </label>
              <input
                id={`nominee-${field}`}
                className="form-control"
                value={nominee[field]}
                maxLength={max}
                required
                onChange={(e) => setNominee({ ...nominee, [field]: e.target.value })}
              />
            </div>
          ))}
          <div className="col-12">
            <button type="submit" className="btn bg-theme-dark text-white rounded" disabled={busy}>
              {t('rights.nominate')}
            </button>
          </div>
        </form>
      </Section>

      <Section title={t('rights.downloadHeading')}>
        <a href="/api/rights/download" className="btn bg-theme-dark text-white rounded" download>
          <i className="uil uil-download-alt me-1" aria-hidden="true" />
          {t('rights.download')}
        </a>
      </Section>

      <Section title={t('rights.eraseHeading')}>
        <p className="fs-15">{t('rights.eraseIntro')}</p>
        <div className="form-check mb-3">
          <input
            id="erase-confirm"
            type="checkbox"
            className="form-check-input"
            checked={eraseConfirm}
            onChange={(e) => setEraseConfirm(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="erase-confirm">
            {t('rights.eraseConfirm')}
          </label>
        </div>
        <button type="button" className="btn btn-danger rounded" disabled={!eraseConfirm || busy} onClick={erase}>
          {t('rights.erase')}
        </button>
      </Section>

      <Section title={t('rights.requestsHeading')}>
        <ul className="fs-15 mb-0">
          {summary.requests.map((r) => (
            <li key={r.createdAt + r.type}>
              {new Date(r.createdAt).toLocaleString()}: {r.type} ({r.status})
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default RightsDashboard;
