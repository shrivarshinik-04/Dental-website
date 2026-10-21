import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CLINIC } from 'config/compliance';
import PageHeader from 'components/PageHeader';
import SampleBadge from 'components/SampleBadge';
import { services } from '../src/data';

/**
 * About page (decision D4: every navigation link leads to a real page). Static content;
 * collects no personal data.
 */
const About = () => (
  <Fragment>
    <Head>
      <title>{`About Us | ${CLINIC.tradeName}`}</title>
    </Head>
    <PageHeader title="About Us" subtitle={`${CLINIC.tradeName}, ${CLINIC.address}`} />
    <section className="wrapper">
      <div className="container py-10 py-md-12">
        <div className="row justify-content-center">
          <div className="col-lg-9 lato fs-17">
            <p>
              <SampleBadge className="me-2" />
              {CLINIC.tradeName} is a <strong>fictitious</strong> dental clinic. This website is a test environment used
              to evaluate privacy controls; it is not a real healthcare provider and no appointment booked here will be
              honoured.
            </p>
            <p>
              The site shows how a clinic website can collect only the information an appointment needs, explain how it
              is used, and let people review, correct or delete it. See the <Link href="/privacy-policy">Privacy Policy</Link>{' '}
              for details.
            </p>
            <h2 className="fs-24 merriweather text-title mt-6">What the sample clinic offers</h2>
            <ul>
              {services.map(({ id, title, href }) => (
                <li key={id}>
                  <Link href={href}>{title}</Link>
                </li>
              ))}
            </ul>
            <p className="mb-0">
              Opening hours: {CLINIC.hours}. <Link href="/contact">Contact us</Link> or{' '}
              <Link href="/book-appointment">request an appointment</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  </Fragment>
);

export default About;
