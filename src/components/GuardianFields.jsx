import { forwardRef } from 'react';

/**
 * Parent or guardian details for a patient under 18, shown inline below the age question.
 * Collects only: full name, relationship, mobile, email (optional) and the declaration.
 * No date of birth, ID documents or proof of guardianship (not needed; formal verification
 * of guardianship is an open legal question, see docs/audit/06-results.md).
 * Legal mapping (comments only): SPDI Rules 2011 Rule 5(2); DPDP Act s.9 / Rules 10, 12 and
 * Fourth Schedule Part A item 1 (from about May 2027).
 */
const GuardianFields = forwardRef(({ form, set, invalid, fieldError, described, t }, firstFieldRef) => (
  <fieldset className="border rounded p-3 bg-grays" aria-describedby="guardian-intro guardian-contact-note">
    <legend className="fs-18 merriweather text-title float-none w-auto px-1 mb-1">{t('booking.guardianHeading')}</legend>
    <p className="fs-15" id="guardian-intro">
      {t('booking.guardianIntro')}
    </p>
    <div className="row g-3">
      <div className="col-md-6">
        <label htmlFor="field-guardianName" className="form-label">
          {t('booking.guardianName')} *
        </label>
        <input
          ref={firstFieldRef}
          id="field-guardianName"
          className={`form-control${invalid('guardianName')}`}
          value={form.guardianName}
          onChange={set('guardianName')}
          autoComplete="name"
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
          {['PARENT', 'LEGAL_GUARDIAN'].map((r) => (
            <option key={r} value={r}>
              {t(`booking.relationships.${r}`)}
            </option>
          ))}
        </select>
        {fieldError('guardianRelationship')}
      </div>
      <div className="col-md-6">
        <label htmlFor="field-guardianPhone" className="form-label">
          {t('booking.guardianPhone')} *
        </label>
        <input
          id="field-guardianPhone"
          type="tel"
          className={`form-control${invalid('guardianPhone')}`}
          value={form.guardianPhone}
          onChange={set('guardianPhone')}
          autoComplete="tel"
          maxLength={16}
          required
          aria-describedby={described('guardianPhone', 'hint-guardianPhone')}
        />
        <div id="hint-guardianPhone" className="form-text">
          {t('booking.phoneHint')}
        </div>
        {fieldError('guardianPhone')}
      </div>
      <div className="col-md-6">
        <label htmlFor="field-guardianEmail" className="form-label">
          {t('booking.guardianEmail')} ({t('common.optional')})
        </label>
        <input
          id="field-guardianEmail"
          type="email"
          className={`form-control${invalid('guardianEmail')}`}
          value={form.guardianEmail}
          onChange={set('guardianEmail')}
          autoComplete="email"
          maxLength={254}
          aria-describedby={described('guardianEmail')}
        />
        {fieldError('guardianEmail')}
      </div>
      <div className="col-12">
        <p className="fs-14 mb-2" id="guardian-contact-note">
          <i className="uil uil-info-circle me-1" aria-hidden="true" />
          {t('booking.guardianContactNote')}
        </p>
        <div className="form-check">
          <input
            id="field-guardianDeclaration"
            type="checkbox"
            className={`form-check-input${invalid('guardianDeclaration')}`}
            checked={form.guardianDeclaration}
            onChange={set('guardianDeclaration')}
            required
            aria-describedby={described('guardianDeclaration')}
          />
          <label className="form-check-label" htmlFor="field-guardianDeclaration">
            {t('booking.guardianDeclaration')} *
          </label>
        </div>
        {fieldError('guardianDeclaration')}
      </div>
    </div>
  </fieldset>
));

GuardianFields.displayName = 'GuardianFields';

export default GuardianFields;
