import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

/**
 * Shell for the admin area (DPDP Rules 2025, Rule 6(1)(b): role-based access).
 * Shows only the sections the signed-in role may open.
 */
const SECTIONS = [
  ['/admin/appointments', 'Appointments', 'appointments'],
  ['/admin/consents', 'Consent log', 'consents'],
  ['/admin/rights', 'Rights requests', 'rights'],
  ['/admin/grievances', 'Grievances', 'grievances'],
  ['/admin/nominations', 'Nominations', 'nominations'],
  ['/admin/breaches', 'Breach incidents', 'breaches'],
  ['/admin/analytics', 'Analytics', 'analytics']
];

const AdminLayout = ({ title, admin, permissions = [], denied, children }) => {
  const { pathname } = useRouter();

  return (
    <section className="wrapper">
      <Head>
        <title>{`${title} | Clinic admin`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="container py-8 lato">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
          <h1 className="fs-30 merriweather text-title mb-0">{title}</h1>
          {admin && (
            <span className="fs-14">
              Signed in as <strong>{admin.username}</strong> ({admin.role})
            </span>
          )}
        </div>
        {admin && (
          <nav className="nav nav-pills flex-wrap gap-2 mb-6" aria-label="Admin sections">
            <Link href="/admin" className={`nav-link px-3 ${pathname === '/admin' ? 'bg-theme-dark' : 'border'}`}>
              Overview
            </Link>
            {SECTIONS.filter(([, , perm]) => permissions.includes(perm)).map(([href, label]) => (
              <Link key={href} href={href} className={`nav-link px-3 ${pathname === href ? 'bg-theme-dark' : 'border'}`}>
                {label}
              </Link>
            ))}
          </nav>
        )}
        {denied ? (
          <div className="alert alert-danger">
            {denied === 'forbidden'
              ? 'Your role does not have access to this section.'
              : denied === 'throttled'
                ? 'Too many failed sign-in attempts. Try again in 15 minutes.'
                : 'Please sign in to continue.'}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

export default AdminLayout;
