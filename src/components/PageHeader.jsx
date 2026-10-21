/**
 * Title band for inner pages, matching the site's colours.
 */
const PageHeader = ({ title, subtitle }) => (
  <section className="wrapper bg-grays">
    <div className="container py-8 py-md-10 text-center">
      <h1 className="merriweather fs-36 text-title mb-2">{title}</h1>
      {subtitle && <p className="lato lead fs-18 mb-0 mx-auto" style={{ maxWidth: 720 }}>{subtitle}</p>}
    </div>
  </section>
);

export default PageHeader;
