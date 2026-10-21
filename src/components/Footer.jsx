import NextLink from 'components/NextLink';
import SocialLinks from 'components/SocialLinks';
import ContactBlock from 'components/ContactBlock';
import Image from 'next/image';
import { useConsent } from 'lib/consentStore';
import { useT } from 'lib/i18n';
import { services, usefulLinks, legalLinks } from '../data';
import { APPOINTMENTS_DESK, CLINIC } from 'config/compliance';
import SampleBadge from 'components/SampleBadge';

/**
 * Renders a footer widget with a title and list of links.
 *
 * @param {Array} list - List of items with `id` and `title`.
 * @param {string} title - Widget section title.
 * @returns {JSX.Element} Footer widget.
 */
const renderWidget = (list, title) => (
  <div className="widget">
    <h3 className="widget-title fs-24 mb-3 merriweather">{title}</h3>
    <ul className="list-unstyled text-reset mb-0">
      {list.map(({ title, id, href }) => (
        <li key={id}>
          <NextLink href={href} title={title} className="lato" />
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Footer component for the website.
 *
 * @returns {JSX.Element} Footer section with logo, widgets, social links, and contact info.
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { openBanner } = useConsent();
  const { t } = useT();

  return (
    <footer className="border-top overflow-hidden bg-color">
      <div className="container pt-10 pt-md-12 pb-7">
        <div className="row gx-10 justify-content-around">
          {/* Logo + Description + Social */}
          <div className="col-lg-3">
            <div className="widget d-flex flex-column align-items-center text-center text-lg-start">
              <div className="mb-5">
                <Image
                  src="/img/logo-light.webp"
                  alt={`${CLINIC.tradeName} logo`}
                  width={200}
                  height={100}
                  className="text-center"
                />
              </div>
              <p className="lead mb-5 fs-18 text-white lato text-justify">
                {CLINIC.tradeName} is a fictitious clinic used as a privacy test environment. It is not a real
                healthcare provider.
              </p>
              <h3 className="fs-24 text-white merriweather">Follow Us On</h3>
              <SocialLinks className="nav social text-md-end" />
            </div>
          </div>

          {/* Services + Useful Links */}
          <div className="col-sm-6 col-md-4 col-lg-2 mt-md-5 mt-lg-0 mt-10 text-white">
            {renderWidget(services, 'Services')}
          </div>
          <div className="col-sm-6 col-md-4 col-lg-2 mt-md-5 mt-lg-0 mt-10 text-white">
            {renderWidget(usefulLinks, 'Useful Links')}
            <div className="mt-6">{renderWidget(legalLinks, 'Privacy')}</div>
          </div>

          {/* Contact Info */}
          <div className="col-md-4 col-lg-3 mt-md-5 mt-lg-0 mt-10">
            <div className="widget">
              <h3 className="widget-title fs-24 mb-3 merriweather">Contact Us</h3>
              <SampleBadge className="mb-3" />
              <div className="d-flex mb-3">
                <i className="uil uil-location-pin-alt fs-30 text-white" />
                <address className="ms-2 text-white lato">
                  {CLINIC.legalName}
                  <br />
                  {CLINIC.address}
                </address>
              </div>
              <div className="d-flex mb-3 align-items-center">
                <i className="uil uil-envelope fs-26 text-white" />
                <a href={`mailto:${APPOINTMENTS_DESK.email}`} className="ms-2 text-white lato">
                  {APPOINTMENTS_DESK.email}
                </a>
              </div>
              <div className="d-flex align-items-center">
                <i className="uil uil-phone-volume fs-26 text-white" />
                <a href={`tel:${APPOINTMENTS_DESK.phone.replace(/\s/g, '')}`} className="ms-2 text-white lato fs-18">
                  {APPOINTMENTS_DESK.phone}
                </a>
              </div>
            </div>
          </div>
        </div>

        <hr className="mt-4 mt-md-4 mb-7" />

        {/* Grievance Officer (SPDI Rules 2011, Rule 5(9), now) and privacy contact (DPDP Rules, Rule 9, from about May 2027), shown prominently. */}
        <div className="row gy-4 align-items-center mb-7">
          <div className="col-lg-8">
            <ContactBlock variant="dark" />
          </div>
          <div className="col-lg-4 text-lg-end">
            {/* s.6(4): withdrawal as easy as giving consent, from every page. */}
            <button type="button" className="btn btn-sm btn-white rounded lato text-title" onClick={openBanner}>
              <i className="uil uil-setting me-1" aria-hidden="true" />
              {t('cookie.settings')}
            </button>
          </div>
        </div>

        <div className="d-md-flex align-items-center justify-content-center">
          <p className="mb-2 mb-lg-0 text-white lato text-center">
            © {currentYear} {CLINIC.legalName}. Sample site for privacy testing.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
