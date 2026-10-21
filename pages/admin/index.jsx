/**
 * Admin overview: open and overdue items (DPDP Rules 2025, Rule 7 and Rule 14(3) deadlines).
 * Shows counts only, no personal data.
 */
import Link from 'next/link';
import prisma from 'lib/db';
import { adminProps } from 'lib/adminData';
import { ROLES } from 'lib/adminAuth';
import AdminLayout from 'components/AdminLayout';

const AdminHome = ({ admin, permissions, denied, stats }) => (
  <AdminLayout title="Overview" admin={admin} permissions={permissions} denied={denied}>
    <div className="row g-4">
      {stats.map(({ label, value, overdue, href }) => (
        <div className="col-sm-6 col-lg-4" key={label}>
          <Link href={href} className="card h-100 text-reset">
            <div className="card-body">
              <p className="mb-1 fs-15">{label}</p>
              <p className="fs-30 merriweather text-title mb-0">{value}</p>
              {overdue > 0 && <span className="badge bg-danger">{overdue} overdue</span>}
            </div>
          </Link>
        </div>
      ))}
    </div>
  </AdminLayout>
);

export const getServerSideProps = adminProps(null, async (ctx, admin) => {
  const now = new Date();
  const open = { status: { in: ['OPEN', 'IN_PROGRESS'] } };
  const [appointments, rights, rightsOverdue, grievances, grievancesOverdue, breaches, breachesOverdue] = await Promise.all([
    prisma.appointment.count({ where: { status: { in: ['REQUESTED', 'CONFIRMED'] } } }),
    prisma.rightsRequest.count({ where: open }),
    prisma.rightsRequest.count({ where: { ...open, dueDate: { lt: now } } }),
    prisma.grievance.count({ where: open }),
    prisma.grievance.count({ where: { ...open, dueDate: { lt: now } } }),
    prisma.breachIncident.count({ where: { status: { not: 'CLOSED' } } }),
    prisma.breachIncident.count({ where: { detailedReportSentAt: null, detailedReportDueAt: { lt: now } } })
  ]);
  const all = [
    { label: 'Pending appointments', value: appointments, overdue: 0, href: '/admin/appointments', perm: 'appointments' },
    { label: 'Open rights requests', value: rights, overdue: rightsOverdue, href: '/admin/rights', perm: 'rights' },
    { label: 'Open grievances', value: grievances, overdue: grievancesOverdue, href: '/admin/grievances', perm: 'grievances' },
    { label: 'Open breach incidents', value: breaches, overdue: breachesOverdue, href: '/admin/breaches', perm: 'breaches' }
  ];
  return { props: { stats: all.filter((s) => ROLES[admin.role].includes(s.perm)) } };
});

export default AdminHome;
