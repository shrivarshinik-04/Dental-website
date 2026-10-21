import { CLINIC, GRIEVANCE_OFFICER, PRIVACY_CONTACT } from 'config/compliance';
import { useT } from 'lib/i18n';
import SampleBadge from 'components/SampleBadge';

/**
 * Who to contact about personal data.
 * - Grievance Officer: IT (SPDI) Rules 2011, Rule 5(9) (in force): name and contact
 *   published on the website; grievances redressed within one month.
 * - Privacy contact: DPDP Act s.8(9) and DPDP Rules, Rule 9 (from about May 2027).
 *
 * @param {'light'|'dark'} variant `dark` for use on the footer gradient.
 */
const Person = ({ label, person, note, text }) => (
  <div className="mb-3">
    <p className={`mb-1 fw-bold ${text}`}>{label}</p>
    <p className={`mb-0 fs-15 ${text}`}>
      {person.name}
      <br />
      <i className="uil uil-envelope me-1" aria-hidden="true" />
      <a href={`mailto:${person.email}`} className={text}>
        {person.email}
      </a>
      <br />
      <i className="uil uil-phone-volume me-1" aria-hidden="true" />
      <a href={`tel:${person.phone.replace(/\s/g, '')}`} className={text}>
        {person.phone}
      </a>
    </p>
    {note && <p className={`mb-0 fs-14 ${text}`}>{note}</p>}
  </div>
);

const ContactBlock = ({ variant = 'light', className = '' }) => {
  const { t } = useT();
  const text = variant === 'dark' ? 'text-white' : '';

  return (
    <div className={`lato ${text} ${className}`}>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <p className={`mb-0 fw-bold fs-17 ${text}`}>{t('common.contactBlockTitle')}</p>
        <SampleBadge />
      </div>
      <div className="row">
        <div className="col-md-6">
          <Person label={t('common.grievanceOfficer')} person={GRIEVANCE_OFFICER} note={t('common.grievanceOfficerNote')} text={text} />
        </div>
        <div className="col-md-6">
          <Person label={t('common.privacyContact')} person={PRIVACY_CONTACT} text={text} />
        </div>
      </div>
      <address className={`mb-0 fs-14 ${text}`}>
        <i className="uil uil-location-pin-alt me-1" aria-hidden="true" />
        {CLINIC.legalName}, {CLINIC.address} · {CLINIC.hours}
      </address>
    </div>
  );
};

export default ContactBlock;
