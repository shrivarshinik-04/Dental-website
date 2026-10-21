/**
 * Appointment booking, collection point A.
 * DPDP Act s.5 + Rule 3 (notice with itemised data before the consent request),
 * s.6(1) (one unticked checkbox per purpose; the required purpose is not bundled with
 * reminders or marketing; the form submits without the optional ones), s.9 + Rule 12 /
 * Fourth Schedule Part A item 1 (children: guardian consent and declaration, minimum
 * data, no marketing, no analytics for the session).
 */
import { Fragment, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { NOTICE_VERSION } from 'config/compliance';
import { useConsent } from 'lib/consentStore';
import { useT } from 'lib/i18n';
import PageHeader from 'components/PageHeader';
import ConsentNotice from 'components/ConsentNotice';
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
  guardianDeclaration: false,
  consentAppointment: false,
  consentReminders: false,
  consentMarketing: false
};

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'name';
  if (!/^(\+?91|0)?[6-9]\d{9}$/.test(form.phone.replace(/[\s()-]/g, ''))) errors.phone = 'phone';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'email';
  if (!form.service) errors.service = 'service';
  if (!form.preferredDate || form.preferredDate < localToday()) errors.preferredDate = 'date';
  if (!form.preferredSlot) errors.preferredSlot = 'slot';
  if (form.isMinor === null) errors.isMinor = 'isMinor';
  if (form.isMinor) {
    if (!form.guardianName.trim()) errors.guardianName = 'guardianName';
    if (!form.guardianRelationship) errors.guardianRelationship = 'guardianRelationship';
    if (!form.guardianDeclaration) errors.guardianDeclaration = 'guardianDeclaration';
  }
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
  const [status, setStatus] = useState({ busy: false, error: '', referenceId: '' });
  // Set after mount: the server may be in another timezone than the visitor, and a
  // different value would cause a hydration mismatch.
  const [today, setToday] = useState('');
  useEffect(() => setToday(localToday()), []);

  // A child's booking: no analytics or marketing for the rest of this session (s.9(3)).
  useEffect(() => {
    if (form.isMinor !== null) setMinorSession(form.isMinor);
  }, [form.isMinor, setMinorSession]);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setMinor = (value) =>
    setForm((prev) => ({
      ...prev,
      isMinor: value,
      // Marketing is never offered for a child.
      consentMarketing: value ? false : prev.consentMarketing,
      ...(value ? {} : { guardianName: '', guardianRelationship: '', guardianDeclaration: false })
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
      const { referenceId } = await postJson('/api/appointments', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        service: form.service,
        preferredDate: form.preferredDate,
        preferredSlot: form.preferredSlot,
        reason: form.reason,
        isMinor: form.isMinor,
        guardianName: form.isMinor ? form.guardianName : '',
        guardianRelationship: form.isMinor ? form.guardianRelationship : null,
        guardianDeclaration: form.isMinor ? form.guardianDeclaration : false,
        consents: {
          APPOINTMENT: form.consentAppointment,
          APPOINTMENT_REMINDERS_SMS_WHATSAPP: form.consentReminders,
          MARKETING: form.isMinor ? false : form.consentMarketing
        },
        language,
        noticeVersion: NOTICE_VERSION
      });
      setStatus({ busy: false, error: '', referenceId });
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
                  <p className="mb-2">
                    {t('booking.referenceLabel')}: <strong className="fs-20">{status.referenceId}</strong>
                  </p>
                  <p className="fs-15 mb-0">
                    {t('booking.referenceHint')} <Link href="/data-rights">{t('notice.links.rights')}</Link>
                  </p>
                </div>
              )}

              <form onSubmit={submit} noValidate aria-describedby="consent-notice-title">
                <div className="row g-3">
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

                  <fieldset className="col-12" aria-describedby={described('isMinor')}>
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
                    {fieldError('isMinor')}
                  </fieldset>

                  {form.isMinor && (
                    <fieldset className="col-12 border rounded p-3 bg-grays">
                      <legend className="fs-18 merriweather text-title float-none w-auto px-1 mb-1">
                        {t('booking.guardianHeading')}
                      </legend>
                      <p className="fs-15">{t('booking.guardianIntro')}</p>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="field-guardianName" className="form-label">
                            {t('booking.guardianName')} *
                          </label>
                          <input
                            id="field-guardianName"
                            className={`form-control${invalid('guardianName')}`}
                            value={form.guardianName}
                            onChange={set('guardianName')}
                            maxLength={100}
                            required
                            aria-describedby={described('guardianName')}
                          />
                          {fieldError('guardianName')}
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="field-guardianRelationship" className="form-label">
                            {t('booking.guardianRelationship')} *
                          </label>
                          <select
                            id="field-guardianRelationship"
                            className={`form-select${invalid('guardianRelationship')}`}
                            value={form.guardianRelationship}
                            onChange={set('guardianRelationship')}
                            required
                            aria-describedby={described('guardianRelationship')}
                          >
                            <option value="">—</option>
                            {['MOTHER', 'FATHER', 'LEGAL_GUARDIAN'].map((r) => (
                              <option key={r} value={r}>
                                {t(`booking.relationships.${r}`)}
                              </option>
                            ))}
                          </select>
                          {fieldError('guardianRelationship')}
                        </div>
                        <div className="col-12">
                          <div className="form-check">
                            <input
                              id="field-guardianDeclaration"
                              type="checkbox"
                              className={`form-check-input${invalid('guardianDeclaration')}`}
                              checked={form.guardianDeclaration}
                              onChange={set('guardianDeclaration')}
                              required
                            />
                            <label className="form-check-label" htmlFor="field-guardianDeclaration">
                              {t('booking.guardianDeclaration')} *
                            </label>
                          </div>
                          {fieldError('guardianDeclaration')}
                        </div>
                      </div>
                    </fieldset>
                  )}
                </div>

                {/* The notice is shown in full before the consent checkboxes (s.5, Rule 3). */}
                <ConsentNotice
                  className="my-6"
                  showSwitcher={false}
                  dataKeys={['name', 'phone', 'email', 'slot', 'service', 'reason', 'guardian', 'consentProof']}
                  purposeKeys={[
                    'APPOINTMENT',
                    'APPOINTMENT_REMINDERS_SMS_WHATSAPP',
                    ...(form.isMinor ? [] : ['MARKETING'])
                  ]}
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
                      {t('booking.consentAppointment')} ({t('common.required')})
                    </label>
                    {fieldError('consentAppointment')}
                  </div>
                  <div className="form-check mb-2">
                    <input
                      id="field-consentReminders"
                      type="checkbox"
                      className="form-check-input"
                      checked={form.consentReminders}
                      onChange={set('consentReminders')}
                    />
                    <label className="form-check-label" htmlFor="field-consentReminders">
                      {t('booking.consentReminders')} ({t('common.optional')})
                    </label>
                  </div>
                  {/* Hidden for children: no marketing to minors (s.9(3)). */}
                  {!form.isMinor && (
                    <div className="form-check mb-2">
                      <input
                        id="field-consentMarketing"
                        type="checkbox"
                        className="form-check-input"
                        checked={form.consentMarketing}
                        onChange={set('consentMarketing')}
                      />
                      <label className="form-check-label" htmlFor="field-consentMarketing">
                        {t('booking.consentMarketing')} ({t('common.optional')})
                      </label>
                    </div>
                  )}
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
