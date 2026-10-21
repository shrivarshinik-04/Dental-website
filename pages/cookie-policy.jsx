/**
 * Cookie policy. DPDP Act s.5 (notice of what is collected and why) and s.6(1), s.6(4)
 * (opt-in and withdrawal). The table is generated from COOKIES in src/config/compliance.js,
 * the same register used to delete cookies when consent is withdrawn.
 */
import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { COOKIES, NOTICE_VERSION } from 'config/compliance';
import { useConsent } from 'lib/consentStore';
import PageHeader from 'components/PageHeader';
import ContactBlock from 'components/ContactBlock';

const CATEGORY_LABEL = {
  necessary: 'Strictly necessary',
  functional: 'Functional',
  analytics: 'Analytics'
};

const CookiePolicy = () => {
  const { openBanner } = useConsent();

  return (
    <Fragment>
      <Head>
        <title>Cookie Policy | Dental Clinic</title>
      </Head>
      <PageHeader title="Cookie Policy" subtitle={`Version ${NOTICE_VERSION}. The cookies and similar technologies this website uses.`} />
      <section className="wrapper">
        <div className="container py-10 py-md-12">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-9 lato fs-16">
              <p>
                Cookies are small files a website stores on your device. All our cookies are <strong>first-party</strong>:
                set by this site and read only by it. Optional cookies stay off until you turn them on, and the site works
                fully without them.
              </p>
              <p>
                We do not load any content from other websites (fonts, analytics, maps or videos). If you allow analytics,
                our own script counts the pages you visit and sends that to our own server only; switching analytics off
                deletes its cookie and the visits recorded under it.
              </p>

              <div className="table-responsive mb-6">
                <table className="table table-bordered fs-15">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Category</th>
                      <th scope="col">Purpose</th>
                      <th scope="col">Duration</th>
                      <th scope="col">First- or third-party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIES.map((cookie) => (
                      <tr key={cookie.name}>
                        <td>
                          <code>{cookie.name}</code>
                        </td>
                        <td>{CATEGORY_LABEL[cookie.category]}</td>
                        <td>{cookie.purpose}</td>
                        <td>{cookie.duration}</td>
                        <td>{cookie.party}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h2 className="fs-24 merriweather text-title mb-3">Changing your choices</h2>
              <p>
                You can change or withdraw your choices at any time. When you switch a category off, we delete its cookies
                straight away and record the withdrawal.
              </p>
              <button type="button" className="btn bg-theme-dark text-white rounded mb-6" onClick={openBanner}>
                <i className="uil uil-setting me-1" aria-hidden="true" />
                Cookie settings
              </button>
              <p>
                You can also block or delete cookies in your browser settings. Blocking strictly necessary cookies may stop
                parts of the site (such as the Data Rights page) from working.
              </p>
              <p className="mb-8">
                More about how we handle personal data: <Link href="/privacy-policy">Privacy Policy</Link>.
              </p>

              <div className="border rounded p-4 bg-grays">
                <ContactBlock />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fragment>
  );
};

export default CookiePolicy;
