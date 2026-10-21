import { APPOINTMENTS_DESK, CLINIC } from 'config/compliance';
import SampleBadge from 'components/SampleBadge';

const Topbar = () => {
  const contactItems = [
    {
      href: `tel:${APPOINTMENTS_DESK.phone.replace(/\s/g, '')}`,
      icon: 'uil-phone-volume',
      text: APPOINTMENTS_DESK.phone,
    },
    {
      href: `mailto:${APPOINTMENTS_DESK.email}`,
      icon: 'uil-envelope',
      text: APPOINTMENTS_DESK.email,
      // Hidden on narrow screens so the bar stays one row; the footer lists it too.
      className: 'd-none d-lg-flex',
    },
  ];

  const socialLinks = [
    {
      href: 'https://www.facebook.com/',
      icon: 'uil-facebook',
    },
    {
      href: 'https://www.instagram.com/',
      icon: 'uil-instagram',
    },
  ];

  return (
    <section className="bg-color d-none d-md-block">
      <div className="container text-white">
        <div className="row justify-content-between align-items-center">
          <div className="col-auto d-none d-xxl-flex">
            <p className="m-0 text-white lato">
              Opening Time: &nbsp; {CLINIC.hoursShort}
            </p>
          </div>

          {contactItems.map(({ href, icon, text, className = 'd-flex' }, index) => (
            <div
              key={index}
              className={`${className} flex-row align-items-center justify-content-center col-auto me-2`}
            >
              <div className="icon text-white fs-22 mt-1 me-2">
                <i className={`uil ${icon}`} />
              </div>
              <a href={href} className="link-white hover lato">
                {text}
              </a>
            </div>
          ))}

          <div className="col-auto">
            <SampleBadge />
          </div>

          <div className="d-flex flex-row align-items-center justify-content-center col-auto">
            {socialLinks.map(({ href, icon }, index) => (
              <a
                key={index}
                href={href}
                className={`link-white hover${index === 0 ? ' me-2' : ''}`}
              >
                <div className="icon text-white fs-22 mt-1">
                  <i className={`uil ${icon}`} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Topbar;
