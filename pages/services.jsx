import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CLINIC } from 'config/compliance';
import PageHeader from 'components/PageHeader';
import { services } from '../src/data';

/**
 * Services page with one section per service (decision D4): the targets of the Services
 * menu and the footer service links.
 */
const Services = () => (
  <Fragment>
    <Head>
      <title>{`Services | ${CLINIC.tradeName}`}</title>
    </Head>
    <PageHeader title="Our Services" subtitle="Treatments offered by the sample clinic." />
    <section className="wrapper">
      <div className="container py-10 py-md-12">
        <div className="row g-4">
          {services.map(({ id, title, slug, summary }) => (
            <div className="col-md-6" key={id}>
              <section id={slug} className="border rounded p-4 h-100 lato" style={{ scrollMarginTop: 240 }}>
                <h2 className="fs-22 merriweather text-title">{title}</h2>
                <p className="fs-16 mb-3">{summary}</p>
                <Link href="/book-appointment" className="btn btn-sm bg-theme-dark text-white rounded">
                  Request an appointment
                </Link>
              </section>
            </div>
          ))}
        </div>
      </div>
    </section>
  </Fragment>
);

export default Services;
