import React from 'react';
import Header from './Header';
import Footer from './Footer';
import CookieConsent from './CookieConsent';
import { ConsentedScript } from './ConsentGate';
import { ANALYTICS } from 'config/compliance';

/**
 * Shared layout component for wrapping pages with header and footer.
 * @param {React.ReactNode} children - Page content.
 */
const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <main role="main">{children}</main>
      <Footer />
      <CookieConsent />
      {/* Loads nothing unless ANALYTICS.src is set AND the visitor opted in (DPDP Act s.6(1)). */}
      <ConsentedScript category="analytics" src={ANALYTICS.src} />
    </>
  );
};

export default Layout;
