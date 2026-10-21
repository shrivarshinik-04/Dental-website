import { Fragment, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import useSticky from 'hooks/useSticky';

import NextLink from 'components/NextLink';
import SocialLinks from 'components/SocialLinks';
import ListItemLink from 'components/ListItemLink';
import DropdownToggleLink from 'components/DropdownToggleLink';

import { services } from '../data';
import { CLINIC } from 'config/compliance';
import SampleBadge from 'components/SampleBadge';

const Navbar = ({
  fancy = false, // <-- ADD THIS
  navOtherClass = 'navbar-other d-flex d-lg-none',
  navClassName = 'navbar navbar-expand-lg center-nav transparent navbar-light',
}) => {
  const sticky = useSticky(350);
  const navbarRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile menu accessibility: expose its state on the toggle, move focus into it when it
  // opens (so Esc and Tab work), and close it with Esc from anywhere.
  useEffect(() => {
    const menu = document.getElementById('offcanvas-nav');
    if (!menu) return undefined;
    const onShown = () => {
      setMenuOpen(true);
      menu.querySelector('.btn-close')?.focus();
    };
    const onHidden = () => setMenuOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape' && menu.classList.contains('show')) {
        import('bootstrap').then(({ Offcanvas }) => Offcanvas.getOrCreateInstance(menu).hide());
      }
    };
    menu.addEventListener('shown.bs.offcanvas', onShown);
    menu.addEventListener('hidden.bs.offcanvas', onHidden);
    document.addEventListener('keydown', onKey);
    return () => {
      menu.removeEventListener('shown.bs.offcanvas', onShown);
      menu.removeEventListener('hidden.bs.offcanvas', onHidden);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const fixedClassName =
    'navbar navbar-expand-lg center-nav transparent navbar-light navbar-clone fixed';

  const headerContent = (
    <Fragment>
      <div className="navbar-brand w-100">
        <NextLink
          href="/"
          title={
            <Image
              alt={`${CLINIC.tradeName} logo`}
              className="py-2"
              src="/img/logo.webp"
              width={150}
              height={70}
              style={{ height: 'auto' }}
              priority
            />
          }
        />
      </div>

      <div
        id="offcanvas-nav"
        data-bs-scroll="true"
        className="navbar-collapse offcanvas offcanvas-nav offcanvas-start"
      >
        <div className="offcanvas-header d-lg-none offcavas-bg">
          <NextLink
            href="/"
            title={
              <Image
                alt={`${CLINIC.tradeName} logo`}
                className="py-2"
                src="/img/logo-light.webp"
                width={150}
                height={70}
              style={{ height: 'auto' }}
                priority
              />
            }
          />
          <button
            type="button"
            aria-label="Close"
            data-bs-dismiss="offcanvas"
            className="btn-close btn-close-white ms-4"
          />
        </div>

        <div className="offcanvas-body ms-lg-auto d-flex flex-column h-100 offcavas-bg">
          <ul className="navbar-nav">
            <li className="nav-item" data-bs-dismiss="offcanvas">
              <NextLink href="/" title="Home" className="nav-link" />
            </li>
            <li className="nav-item" data-bs-dismiss="offcanvas">
              <NextLink href="/about" title="About Us" className="nav-link" />
            </li>
            <li className="nav-item dropdown">
              <DropdownToggleLink title="Services" className="nav-link dropdown-toggle" />
              <ul className="dropdown-menu" data-bs-dismiss="offcanvas">
                <ListItemLink href="/services" title="All services" linkClassName="dropdown-item" />
                {services.map(({ id, title, href }) => (
                  <ListItemLink key={id} href={href} title={title} linkClassName="dropdown-item" />
                ))}
              </ul>
            </li>
            <li className="nav-item" data-bs-dismiss="offcanvas">
              <NextLink href="/contact" title="Contact Us" className="nav-link" />
            </li>
            <li
              className="nav-item align-items-center d-flex mt-2 mt-lg-0 ms-lg-4 merriweather"
              data-bs-dismiss="offcanvas"
            >
              <NextLink
                title="Book Appointment"
                href="/book-appointment"
                className="btn btn-sm bg-color text-white mb-lg-1 rounded border-0"
              />
            </li>
          </ul>

          {/* ============= Show contact info on small devices ============= */}
          <div className="offcanvas-footer d-lg-none">
            <div>
              <SampleBadge className="mb-2" />
              <br />
              <NextLink title={CLINIC.email} className="link-inverse" href={`mailto:${CLINIC.email}`} />
              <br />
              <NextLink href={`tel:${CLINIC.phone.replace(/\s/g, '')}`} title={CLINIC.phone} />
              <br />
              <SocialLinks />
            </div>
          </div>
        </div>
      </div>

      <div className={navOtherClass}>
        <button
          data-bs-toggle="offcanvas"
          data-bs-target="#offcanvas-nav"
          className="hamburger offcanvas-nav-btn"
          aria-label="Open menu"
          aria-controls="offcanvas-nav"
          aria-expanded={menuOpen}
        >
          <span />
        </button>
      </div>
    </Fragment>
  );

  return (
    <Fragment>
      <nav
        ref={navbarRef}
        className={sticky ? fixedClassName : navClassName}
      >
        {fancy ? (
          <div className="container">
            <div className="navbar-collapse-wrapper bg-white d-flex flex-row flex-nowrap w-100 justify-content-between align-items-end">
              {headerContent}
            </div>
          </div>
        ) : (
          <div className="container flex-lg-row flex-nowrap align-items-center">
            {headerContent}
          </div>
        )}
      </nav>
    </Fragment>
  );
};

export default Navbar;
