/**
 * Appointment booking, collection point A.
 * Patients under 18: the age question comes first; answering "Yes" shows the parent or
 * guardian section inline (announced, focus moved into it) and the guardian's mobile/email
 * replace the patient's. Answering "No" clears and drops the guardian details.
 * DPDP Act s.5 + Rule 3 (notice with itemised data before the consent request),
 * s.6(1) (one unticked checkbox per purpose; the required purpose is not bundled with
 * reminders or marketing; the form submits without the optional ones), s.9 + Rule 12 /
 * Fourth Schedule Part A item 1 (children: guardian consent and declaration, minimum
 * data, no marketing, no analytics for the session).
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { NOTICE_VERSION } from 'config/compliance';
import { useConsent } from 'lib/consentStore';
import { useT } from 'lib/i18n';
import PageHeader from 'components/PageHeader';
import ConsentNotice from 'components/ConsentNotice';
import GuardianFields from 'components/GuardianFields';
import LanguageSwitcher from 'components/LanguageSwitcher';
import { postJson } from 'lib/api';
import { services } from '../src/data';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  service: '',
  preferredDate: '',
  preferredSlot: '',
  reason: '',
  isMinor: null,
  guardianName: '',
  guardianRelationship: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianDeclaration: false,
  consentAppointment: false
};

const GUARDIAN_EMPTY = { guardianName: '', guardianRelationship: '', guardianPhone: '', guardianEmail: '', guardianDeclaration: false };

const validPhone = (value) => /^(\+?91|0)?[6-9]\d{9}$/.test(String(value).replace(/[\s()-]/g, ''));
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const validate = (form) => {
  const errors = {};
  if (form.isMinor === null) errors.isMinor = 'isMinor';
  if (form.isMinor) {
    if (!form.guardianName.trim()) errors.guardianName = 'guardianName';
    if (!form.guardianRelationship) errors.guardianRelationship = 'guardianRelationship';
    if (!validPhone(form.guardianPhone)) errors.guardianPhone = 'guardianPhone';
    if (form.guardianEmail && !validEmail(form.guardianEmail)) errors.guardianEmail = 'guardianEmail';
    if (!form.guardianDeclaration) errors.guardianDeclaration = 'guardianDeclaration';
  }
  if (!form.name.trim()) errors.name = 'name';
  if (form.isMinor !== true) {
    if (!validPhone(form.phone)) errors.phone = 'phone';
    if (form.email && !validEmail(form.email)) errors.email = 'email';
  }
  if (!form.service) errors.service = 'service';
  if (!form.preferredDate || form.preferredDate < localToday()) errors.preferredDate = 'date';
  if (!form.preferredSlot) errors.preferredSlot = 'slot';
  if (!form.consentAppointment) errors.consentAppointment = 'consentAppointment';
  return errors;
};

// Server field names → form field names.
const SERVER_FIELDS = { consents: 'consentAppointment' };

const BookAppointment = () => {
  const { t, language } = useT();
  const { setMinorSession } = useConsent();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ busy: false, error: '', referenceId: '', reused: false });
  // Set after mount: the server may be in another timezone than the visitor, and a
  // different value would cause a hydration mismatch.
  const [today, setToday] = useState('');
  useEffect(() => setToday(localToday()), []);
  // A verified rights-portal session lets a returning patient keep one reference ID.
  const [verifiedRef, setVerifiedRef] = useState(null);
  useEffect(() => {
    fetch('/api/rights/session')
      .then((r) => r.json())
      .then((s) => setVerifiedRef(s.verified ? s.referenceId : null))
      .catch(() => {});
  }, []);

  // A child's booking: no analytics for the rest of this session (s.9(3)).
  useEffect(() => {
    if (form.isMinor !== null) setMinorSession(form.isMinor);
  }, [form.isMinor, setMinorSession]);

  // When the guardian section appears, move focus to its first field.
  const guardianFirstField = useRef(null);
  const wasMinor = useRef(false);
  useEffect(() => {
    if (form.isMinor === true && !wasMinor.current) guardianFirstField.current?.focus();
    wasMinor.current = form.isMinor === true;
  }, [form.isMinor]);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setMinor = (value) =>
    setForm((prev) => ({
      ...prev,
      isMinor: value,
      // Back to an adult patient: clear the guardian details so they are never submitted.
      ...(value ? {} : GUARDIAN_EMPTY)
    }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`field-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setStatus({ busy: true, error: '', referenceId: '' });
    try {
      const { referenceId, reused } = await postJson('/api/appointments', {
        name: form.name,
        // Adults give their own contact; for a patient under 18 the guardian's is used.
        phone: form.isMinor ? '' : form.phone,
        email: form.isMinor ? '' : form.email,
        service: form.service,
        preferredDate: form.preferredDate,
        preferredSlot: form.preferredSlot,
        reason: form.reason,
        isMinor: form.isMinor,
        ...(form.isMinor
          ? {
              guardianName: form.guardianName,
              guardianRelationship: form.guardianRelationship,
              guardianPhone: form.guardianPhone,
              guardianEmail: form.guardianEmail,
              guardianDeclaration: form.guardianDeclaration
            }
          : {}),
        consents: { APPOINTMENT: form.consentAppointment },
        language,
        noticeVersion: NOTICE_VERSION
      });
      setStatus({ busy: false, error: '', referenceId, reused });
      setForm(EMPTY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const fields = err.data?.fields || [];
      setErrors(Object.fromEntries(fields.map((f) => [SERVER_FIELDS[f] || f, SERVER_FIELDS[f] || f])));
      setStatus({ busy: false, error: err.message || t('common.error'), referenceId: '' });
    }
  };

  const fieldError = (field, key = field) =>
    errors[field] ? (
      <div className="invalid-feedback d-block" id={`error-${field}`}>
        {t(`booking.errors.${key}`)}
      </div>
    ) : null;
  const invalid = (field) => (errors[field] ? ' is-invalid' : '');
  const described = (field, hint) => [hint, errors[field] && `error-${field}`].filter(Boolean).join(' ') || undefined;

  return (
    <Fragment>
      <Head>
        <title>{`${t('booking.title')} | Dental Clinic`}</title>
      </Head>
      <PageHeader title={t('booking.title')} subtitle={t('booking.intro')} />

      <section className="wrapper">
        <div className="container py-10 py-md-12">
          <div className="row justify-content-center">
            <div className="col-lg-9 col-xl-8 lato">
              <div className="d-flex justify-content-end mb-4">
                <LanguageSwitcher />
              </div>

              {status.referenceId && (
                <div className="alert alert-success p-4" role="status">
                  <h2 className="fs-22 merriweather mb-2">{t('booking.successTitle')}</h2>
                  <p className="mb-2">{t('booking.successText')}</p>
                  {status.reused && <p className="mb-2">{t('booking.reusedText')}</p>}
                  <p className="mb-2">
                    {t('booking.referenceLabel')}: <strong className="fs-20">{status.referenceId}</strong>
                  </p>
                  <p className="fs-15 mb-0">
                    {t('booking.referenceHint')} <Link href="/data-rights">{t('notice.links.rights')}</Link>
                  </p>
                </div>
              )}

              <p className="fs-15">
                {verifiedRef ? (
                  t('booking.verifiedNote', { ref: verifiedRef })
                ) : (
                  <Fragment>
                    {t('booking.returningHint')} <Link href="/data-rights">{t('notice.links.rights')}</Link>
                  </Fragment>
                )}
              </p>

              <form onSubmit={submit} noValidate aria-describedby="consent-notice-title">
                <div className="row g-3">
                  <fieldset className="col-12" aria-describedby={described('isMinor', 'hint-isMinor')}>
                    <legend className="form-label fs-16 mb-1">{t('booking.isMinor')} *</legend>
                    {[true, false].map((value) => (
                      <div className="form-check form-check-inline" key={String(value)}>
                        <input
                          className={`form-check-input${invalid('isMinor')}`}
                          type="radio"
                          name="isMinor"
                          id={value ? 'field-isMinor' : 'field-isMinor-no'}
                          checked={form.isMinor === value}
                          onChange={() => setMinor(value)}
                        />
                        <label className="form-check-label" htmlFor={value ? 'field-isMinor' : 'field-isMinor-no'}>
                          {value ? t('booking.yes') : t('booking.no')}
                        </label>
                      </div>
                    ))}
                    <div id="hint-isMinor" className="form-text">
                      {t('booking.isMinorHint')}
                    </div>
                    {fieldError('isMinor')}
                  </fieldset>

                  {/* Polite live region with a short message only, so screen readers announce the
                      new section without reading every field aloud. */}
                  <div className="visually-hidden" aria-live="polite" id="guardian-live">
                    {form.isMinor ? t('booking.guardianAnnouncement') : ''}
                  </div>
                  {form.isMinor && (
                    <div className="col-12">
                      <GuardianFields
                        ref={guardianFirstField}
                        form={form}
                        set={set}
                        invalid={invalid}
                        fieldError={fieldError}
                        described={described}
                        t={t}
                      />
                    </div>
                  )}

                  <div className="col-md-6">
                    <label htmlFor="field-name" className="form-label">
                      {t('booking.name')} *
                    </label>
                    <input
                      id="field-name"
                      className={`form-control${invalid('name')}`}
                      value={form.name}
                      onChange={set('name')}
                      autoComplete="name"
                      maxLength={100}
                      required
                      aria-describedby={described('name')}
                    />
                    {fieldError('name')}
                  </div>
                  {/* The patient's own contact is collected for adults only. */}
                  {form.isMinor !== true && (
                    <Fragment>
                  <div className="col-md-6">
                    <label htmlFor="field-phone" className="form-label">
                      {t('booking.phone')} *
                    </label>
                    <input
                      id="field-phone"
                      type="tel"
                      className={`form-control${invalid('phone')}`}
                      value={form.phone}
                      onChange={set('phone')}
                      autoComplete="tel"
                      maxLength={16}
                      required
                      aria-describedby={described('phone', 'hint-phone')}
                    />
                    <div id="hint-phone" className="form-text">
                      {t('booking.phoneHint')}
                    </div>
                    {fieldError('phone')}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="field-email" className="form-label">
                      {t('booking.email')} ({t('common.optional')})
                    </label>
                    <input
                      id="field-email"
                      type="email"
                      className={`form-control${invalid('email')}`}
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      maxLength={254}
                      aria-describedby={described('email')}
                    />
                    {fieldError('email')}
                  </div>
                    </Fragment>
                  )}
                  <div className="col-md-6">
                    <label htmlFor="field-service" className="form-label">
                      {t('booking.service')} *
                    </label>
                    <select
                      id="field-service"
                      className={`form-select${invalid('service')}`}
                      value={form.service}
                      onChange={set('service')}
                      required
                      aria-describedby={described('service')}
                    >
                      <option value="">{t('booking.selectService')}</option>
                      {services.map(({ id, title }) => (
                        <option key={id} value={title}>
                          {title}
                        </option>
                      ))}
                    </select>
                    {fieldError('service')}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="field-preferredDate" className="form-label">
                      {t('booking.date')} *
                    </label>
                    <input
                      id="field-preferredDate"
                      type="date"
                      min={today || undefined}
                      className={`form-control${invalid('preferredDate')}`}
                      value={form.preferredDate}
                      onChange={set('preferredDate')}
                      required
                      aria-describedby={described('preferredDate')}
                    />
                    {fieldError('preferredDate', 'date')}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="field-preferredSlot" className="form-label">
                      {t('booking.slot')} *
                    </label>
                    <select
                      id="field-preferredSlot"
                      className={`form-select${invalid('preferredSlot')}`}
                      value={form.preferredSlot}
                      onChange={set('preferredSlot')}
                      required
                      aria-describedby={described('preferredSlot')}
                    >
                      <option value="">—</option>
                      {['MORNING', 'EVENING'].map((slot) => (
                        <option key={slot} value={slot}>
                          {t(`booking.slots.${slot}`)}
                        </option>
                      ))}
                    </select>
                    {fieldError('preferredSlot', 'slot')}
                  </div>
                  <div className="col-12">
                    <label htmlFor="field-reason" className="form-label">
                      {t('booking.reason')} ({t('common.optional')})
                    </label>
                    <textarea
                      id="field-reason"
                      className="form-control"
                      rows={2}
                      maxLength={300}
                      value={form.reason}
                      onChange={set('reason')}
                      aria-describedby="hint-reason"
                    />
                    <div id="hint-reason" className="form-text">
                      {t('booking.reasonHint')}
                    </div>
                  </div>

                </div>

                {/* The notice is shown in full before the consent checkboxes (s.5, Rule 3). */}
                <ConsentNotice
                  className="my-6"
                  showSwitcher={false}
                  dataKeys={['name', 'phone', 'email', 'slot', 'service', 'reason', 'guardian', 'consentProof']}
                  purposeKeys={['APPOINTMENT']}
                />

                <fieldset className="mb-4">
                  <legend className="fs-20 merriweather text-title">{t('booking.consentHeading')}</legend>
                  {/* One checkbox per purpose, none pre-ticked (s.6(1)). */}
                  <div className="form-check mb-2">
                    <input
                      id="field-consentAppointment"
                      type="checkbox"
                      className={`form-check-input${invalid('consentAppointment')}`}
                      checked={form.consentAppointment}
                      onChange={set('consentAppointment')}
                      required
                      aria-describedby={described('consentAppointment')}
                    />
                    <label className="form-check-label" htmlFor="field-consentAppointment">
                      {form.isMinor ? t('booking.consentAppointmentGuardian') : t('booking.consentAppointment')} (
                      {t('common.required')})
                    </label>
                    {fieldError('consentAppointment')}
                  </div>
                </fieldset>

                {status.error && (
                  <p className="text-danger" role="alert">
                    {status.error}
                  </p>
                )}

                <button type="submit" className="btn btn-lg bg-color text-white rounded border-0 merriweather" disabled={status.busy}>
                  {status.busy ? t('common.loading') : t('booking.submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Fragment>
  );
};

export default BookAppointment;
