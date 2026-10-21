import { Fragment } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { CLINIC } from 'config/compliance';

/** Branded "page not found" page with links back into the site. */
const NotFound = () => (
  <Fragment>
    <Head>
      <title>{`Page not found | ${CLINIC.tradeName}`}</title>
    </Head>
    <section className="wrapper">
      <div className="container py-10 py-md-12 text-center lato">
        <Image src="/img/404.webp" alt="" width={400} height={158} className="mb-6" style={{ height: 'auto' }} />
        <h1 className="merriweather fs-36 text-title mb-3">Page not found</h1>
        <p className="fs-18 mb-6">The page you are looking for does not exist or has moved.</p>
        <Link href="/" className="btn bg-theme-dark text-white rounded me-2">
          Go to the home page
        </Link>
        <Link href="/sitemap" className="btn btn-white border text-title rounded">
          See all pages
        </Link>
      </div>
    </section>
  </Fragment>
);

export default NotFound;
