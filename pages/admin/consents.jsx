/**
 * Consent ledger viewer with filters and CSV export: the Data Fiduciary's proof that
 * consent was given, refused or withdrawn against a specific notice version (DPDP Act
 * s.6(10)). Read-only; the ledger is append-only.
 */
import prisma from 'lib/db';
import { adminProps, noStore } from 'lib/adminData';
import { CONSENT_OPTIONS, consentFilters, consentSelect, consentWhere } from 'lib/consentQuery';
import AdminLayout from 'components/AdminLayout';

const Consents = ({ admin, permissions, denied, records = [], filters = {}, total = 0 }) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();

  return (
    <AdminLayout title="Consent log" admin={admin} permissions={permissions} denied={denied}>
      <form className="row g-2 align-items-end mb-4" method="get">
        {[
          ['purpose', CONSENT_OPTIONS.PURPOSES],
          ['status', CONSENT_OPTIONS.STATUSES],
          ['channel', CONSENT_OPTIONS.CHANNELS]
        ].map(([name, options]) => (
          <div className="col-md-3 col-lg-2" key={name}>
            <label className="form-label fs-14 text-capitalize" htmlFor={`f-${name}`}>
              {name}
            </label>
            <select id={`f-${name}`} name={name} className="form-select form-select-sm" defaultValue={filters[name]}>
              <option value="">All</option>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <div className="col-md-3 col-lg-2">
          <label className="form-label fs-14" htmlFor="f-reference">
            Reference ID
          </label>
          <input id="f-reference" name="reference" className="form-control form-control-sm" defaultValue={filters.reference} />
        </div>
        <div className="col-md-3 col-lg-1">
          <label className="form-label fs-14" htmlFor="f-from">
            From
          </label>
          <input id="f-from" type="date" name="from" className="form-control form-control-sm" defaultValue={filters.from} />
        </div>
        <div className="col-md-3 col-lg-1">
          <label className="form-label fs-14" htmlFor="f-to">
            To
          </label>
          <input id="f-to" type="date" name="to" className="form-control form-control-sm" defaultValue={filters.to} />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-sm bg-theme-dark text-white rounded">
            Filter
          </button>
        </div>
        <div className="col-auto">
          <a href={`/api/admin/consents-export${query ? `?${query}` : ''}`} className="btn btn-sm btn-white border text-title rounded">
            Export CSV
          </a>
        </div>
      </form>
      <p className="fs-14">
        Showing {records.length} of {total} records (newest first).
      </p>
      <div className="table-responsive">
        <table className="table table-sm fs-13">
          <thead>
            <tr>
              <th>Time</th>
              <th>Reference / anon ID</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Channel</th>
              <th>Notice</th>
              <th>Lang</th>
              <th>Guardian</th>
              <th>IP hash</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.timestamp).toLocaleString('en-IN')}</td>
                <td>{r.dataPrincipal?.referenceId || r.anonymousId?.slice(0, 8)}</td>
                <td>{r.purpose}</td>
                <td>
                  <span className={`badge ${r.status === 'GIVEN' ? 'bg-success' : r.status === 'WITHDRAWN' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                    {r.status}
                  </span>
                </td>
                <td>{r.channel}</td>
                <td>{r.noticeVersion.version}</td>
                <td>{r.language}</td>
                <td>{r.givenByGuardian ? 'Yes' : ''}</td>
                <td>
                  <code>{r.ipHash?.slice(0, 10)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps = adminProps('consents', async ({ res, query }) => {
  noStore(res);
  const filters = consentFilters(query);
  const where = consentWhere(filters);
  const [records, total] = await Promise.all([
    prisma.consentRecord.findMany({ where, orderBy: { timestamp: 'desc' }, take: 500, select: consentSelect }),
    prisma.consentRecord.count({ where })
  ]);
  return { entity: 'ConsentRecord', viewed: records.length ? [`list:${records.length}`] : [], props: { records, filters, total } };
});

export default Consents;
