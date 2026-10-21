import Head from 'next/head';
import { useRouter } from 'next/router';
import { Fragment, useEffect, useState } from 'react';
import ThemeProvider from 'theme/ThemeProvider';
import Layout from 'components/Layout';
import { CLINIC } from 'config/compliance';
import { ConsentProvider } from 'lib/consentStore';
import { LanguageProvider } from 'lib/i18n';

// Self-hosted fonts: no request to Google before (or without) consent (DPDP Act s.6(1)).
import '@fontsource/lato/300.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/400-italic.css';
import '@fontsource/lato/700.css';
import '@fontsource/lato/900.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/600.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
// Devanagari fallback so Hindi notices render on every device (s.5(3)). Its unicode-range
// means it is only downloaded when Devanagari text is shown.
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import 'animate.css';
import 'styles/style.css';
import 'styles/responsive.css';
import 'plyr-react/plyr.css';
import 'plugins/scrollcue/scrollCue.css';
import 'assets/scss/style.scss';

function MyApp({ Component, pageProps }) {
  const { pathname } = useRouter();
  // Page content is always server-rendered so notices, policies and contact details are in the
  // HTML (readable without JavaScript). The loader only covers the page until hydration.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') import('bootstrap');
  }, []);

  useEffect(() => {
    (async () => {
      const scrollCue = (await import('plugins/scrollcue')).default;
      scrollCue.init({ interval: -400, duration: 700, percentage: 0.8 });
      scrollCue.update();
    })();
  }, [pathname]);

  useEffect(() => setHydrated(true), []);

  return (
    <Fragment>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{CLINIC.tradeName}</title>
        <meta name="description" content={`${CLINIC.tradeName}: a fictitious dental clinic used as a privacy test environment.`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={CLINIC.tradeName} />
        <meta property="og:description" content={`${CLINIC.tradeName}: a fictitious dental clinic used as a privacy test environment.`} />
      </Head>
      <ConsentProvider>
        <LanguageProvider>
          <Layout>
            <ThemeProvider>
              {!hydrated && <div className="page-loader" aria-hidden="true" />}
              <Component {...pageProps} />
            </ThemeProvider>
          </Layout>
        </LanguageProvider>
      </ConsentProvider>
    </Fragment>
  );
}

export default MyApp;
