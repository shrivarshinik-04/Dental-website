import { CONTACT_PERSON } from 'config/compliance';
import { useT } from 'lib/i18n';

/**
 * Business contact of the person who answers questions about personal data.
 * DPDP Act s.8(9) / s.5(1)(ii); DPDP Rules 2025, Rule 9 (publish prominently) and
 * Rule 3(c).
 *
 * @param {'light'|'dark'} variant `dark` for use on the footer gradient.
 */
const ContactBlock = ({ variant = 'light', className = '' }) => {
  const { t } = useT();
  const text = variant === 'dark' ? 'text-white' : '';

  return (
    <div className={`lato ${text} ${className}`}>
      <p className={`mb-1 fw-bold ${text}`}>{t('common.contactBlockTitle')}</p>
      <p className={`mb-2 fs-15 ${text}`}>{t('common.contactBlockText')}</p>
      <address className={`mb-0 fs-15 ${text}`}>
        <strong>{CONTACT_PERSON.name}</strong>, {CONTACT_PERSON.designation}
        <br />
        <i className="uil uil-envelope me-1" aria-hidden="true" />
        <a href={`mailto:${CONTACT_PERSON.email}`} className={text}>
          {CONTACT_PERSON.email}
        </a>
        <br />
        <i className="uil uil-phone-volume me-1" aria-hidden="true" />
        <a href={`tel:${CONTACT_PERSON.phone}`} className={text}>
          {CONTACT_PERSON.phone}
        </a>
        <br />
        <i className="uil uil-location-pin-alt me-1" aria-hidden="true" />
        {CONTACT_PERSON.address}
        <br />
        <span className="fs-14">{CONTACT_PERSON.hours}</span>
      </address>
    </div>
  );
};

export default ContactBlock;
