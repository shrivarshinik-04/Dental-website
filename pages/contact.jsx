import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { APPOINTMENTS_DESK, CLINIC } from 'config/compliance';
import PageHeader from 'components/PageHeader';
import ContactBlock from 'components/ContactBlock';
import SampleBadge from 'components/SampleBadge';

/**
 * Contact page (decision D4). Shows the sample contact details from
 * src/config/compliance.js; there is no contact form, so nothing is collected here.
 */
const Contact = () => (
  <Fragment>
    <Head>
      <title>{`Contact Us | ${CLINIC.tradeName}`}</title>
    </Head>
    <PageHeader title="Contact Us" subtitle={CLINIC.hours} />
    <section className="wrapper">
      <div className="container py-10 py-md-12">
        <div className="row justify-content-center gy-6">
          <div className="col-lg-5 lato">
            <div className="d-flex align-items-center gap-2 mb-3">
              <h2 className="fs-22 merriweather text-title mb-0">Appointments</h2>
              <SampleBadge />
            </div>
            <address className="fs-16">
              {CLINIC.legalName}
              <br />
              {CLINIC.address}
              <br />
              <i className="uil uil-phone-volume me-1" aria-hidden="true" />
              <a href={`tel:${APPOINTMENTS_DESK.phone.replace(/\s/g, '')}`}>{APPOINTMENTS_DESK.phone}</a>
              <br />
              <i className="uil uil-envelope me-1" aria-hidden="true" />
              <a href={`mailto:${APPOINTMENTS_DESK.email}`}>{APPOINTMENTS_DESK.email}</a>
            </address>
            <p className="fs-16 mb-0">
              To request a visit, use the <Link href="/book-appointment">appointment form</Link>.
            </p>
          </div>
          <div className="col-lg-7">
            <div className="border rounded p-4 bg-grays">
              <ContactBlock />
            </div>
          </div>
        </div>
      </div>
    </section>
  </Fragment>
);

export default Contact;
