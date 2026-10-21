import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CLINIC } from 'config/compliance';
import PageHeader from 'components/PageHeader';
import { legalLinks, services, usefulLinks } from '../src/data';

/** Human-readable sitemap of every public page (decision D4). */
const Sitemap = () => (
  <Fragment>
    <Head>
      <title>{`Sitemap | ${CLINIC.tradeName}`}</title>
    </Head>
    <PageHeader title="Sitemap" />
    <section className="wrapper">
      <div className="container py-10 py-md-12 lato fs-16">
        <div className="row gy-6">
          <div className="col-md-4">
            <h2 className="fs-20 merriweather text-title">Pages</h2>
            <ul>
              {usefulLinks.map(({ id, title, href }) => (
                <li key={id}>
                  <Link href={href}>{title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-4">
            <h2 className="fs-20 merriweather text-title">Services</h2>
            <ul>
              {services.map(({ id, title, href }) => (
                <li key={id}>
                  <Link href={href}>{title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-4">
            <h2 className="fs-20 merriweather text-title">Privacy</h2>
            <ul>
              {legalLinks.map(({ id, title, href }) => (
                <li key={id}>
                  <Link href={href}>{title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  </Fragment>
);

export default Sitemap;
