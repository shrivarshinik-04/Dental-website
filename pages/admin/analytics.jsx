/**
 * Aggregate view of the first-party analytics (decision D1). Shows counts only: no
 * visitor IDs or individual visit trails, so no personal data is displayed.
 */
import prisma from 'lib/db';
import { RETENTION } from 'config/compliance';
import { adminProps, noStore } from 'lib/adminData';
import AdminLayout from 'components/AdminLayout';

const Analytics = ({ admin, permissions, denied, byPath = [], visitors = 0, total = 0, days = 30 }) => (
  <AdminLayout title="Analytics" admin={admin} permissions={permissions} denied={denied}>
    <p className="fs-15">
      Page views recorded with analytics consent in the last {days} days: <strong>{total}</strong> from{' '}
      <strong>{visitors}</strong> browsers. Events are kept {RETENTION.analyticsEventDays} days and erased when a visitor
      withdraws consent.
    </p>
    <div className="table-responsive">
      <table className="table table-sm fs-14">
        <thead>
          <tr>
            <th>Page</th>
            <th className="text-end">Views</th>
          </tr>
        </thead>
        <tbody>
          {byPath.map((row) => (
            <tr key={row.path}>
              <td>
                <code>{row.path}</code>
              </td>
              <td className="text-end">{row.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!byPath.length && <p>No page views recorded.</p>}
  </AdminLayout>
);

export const getServerSideProps = adminProps('analytics', async ({ res }) => {
  noStore(res);
  const days = 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = { timestamp: { gte: since } };
  const [grouped, total, distinct] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ['path'], where, _count: { _all: true }, orderBy: { _count: { path: 'desc' } } }),
    prisma.analyticsEvent.count({ where }),
    prisma.analyticsEvent.findMany({ where, distinct: ['visitorId'], select: { visitorId: true } })
  ]);
  return {
    props: {
      days,
      total,
      visitors: distinct.length,
      byPath: grouped.map((g) => ({ path: g.path, views: g._count._all }))
    }
  };
});

export default Analytics;
