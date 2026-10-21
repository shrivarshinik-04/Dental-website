import Link from 'next/link';
import { useT } from 'lib/i18n';
import BoardLink from 'components/BoardLink';
import ContactBlock from 'components/ContactBlock';
import LanguageSwitcher from 'components/LanguageSwitcher';

/**
 * Privacy notice shown before or together with every consent request.
 * Now: SPDI Rules 2011, Rule 5(1) (consent before collecting sensitive data) and 5(3)
 * (fact of collection, purpose, recipients, name and address of the collecting agency).
 * From about May 2027: DPDP Act s.5 and s.6 and DPDP Rules 2025, Rule 3 (itemised data,
 * specified purposes, withdrawal, rights and Board complaint), s.5(3) (language), Rule 9.
 *
 * The text comes from src/locales/<lang>.json → "notice", which is stored verbatim in
 * NoticeVersion so every consent can be traced to exactly what was shown (s.6(10)).
 *
 * @param {string[]} dataKeys    keys of notice.data to list
 * @param {string[]} purposeKeys keys of notice.purposes to list
 */
const ConsentNotice = ({ dataKeys, purposeKeys, headingLevel = 2, showSwitcher = true, className = '', idPrefix = 'consent-notice' }) => {
  const { t } = useT();
  const Heading = `h${headingLevel}`;
  const SubHeading = `h${headingLevel + 1}`;

  return (
    <section className={`border rounded p-4 bg-white lato ${className}`} aria-labelledby={`${idPrefix}-title`}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <Heading id={`${idPrefix}-title`} className="fs-22 merriweather text-title mb-0">
          {t('notice.title')}
        </Heading>
        {showSwitcher && <LanguageSwitcher />}
      </div>

      <p className="fs-15">{t('notice.intro')}</p>

      <SubHeading className="fs-17 merriweather text-title mt-4">{t('notice.dataHeading')}</SubHeading>
      <ul className="fs-15 mb-3">
        {dataKeys.map((key) => (
          <li key={key}>{t(`notice.data.${key}`)}</li>
        ))}
      </ul>

      <SubHeading className="fs-17 merriweather text-title mt-4">{t('notice.purposesHeading')}</SubHeading>
      <ul className="fs-15 mb-3">
        {purposeKeys.map((key) => (
          <li key={key} className="mb-1">
            <strong>{t(`notice.purposes.${key}.title`)}</strong>: {t(`notice.purposes.${key}.description`)}
          </li>
        ))}
      </ul>

      <SubHeading className="fs-17 merriweather text-title mt-4">{t('notice.recipientsHeading')}</SubHeading>
      <p className="fs-15 mb-3">{t('notice.recipients')}</p>

      <SubHeading className="fs-17 merriweather text-title mt-4">{t('notice.rightsHeading')}</SubHeading>
      <p className="fs-15 mb-2">{t('notice.withdraw')}</p>
      <p className="fs-15 mb-2">{t('notice.rights')}</p>
      <p className="fs-15 mb-2">{t('notice.grievance')}</p>
      <p className="fs-15 mb-3">{t('notice.board')}</p>
      <ul className="list-inline fs-15 mb-3">
        <li className="list-inline-item">
          <Link href="/data-rights">{t('notice.links.rights')}</Link>
        </li>
        <li className="list-inline-item">
          <Link href="/grievance">{t('notice.links.grievance')}</Link>
        </li>
        <li className="list-inline-item">
          <Link href="/privacy-policy">{t('notice.links.privacy')}</Link>
        </li>
        <li className="list-inline-item">
          <Link href="/cookie-policy">{t('notice.links.cookies')}</Link>
        </li>
        <li className="list-inline-item">
          <BoardLink />
        </li>
      </ul>

      <SubHeading className="fs-17 merriweather text-title mt-4">{t('notice.contactHeading')}</SubHeading>
      <ContactBlock />

      <p className="fs-13 text-muted mt-3 mb-0">{t('notice.version')}</p>
    </section>
  );
};

export default ConsentNotice;
