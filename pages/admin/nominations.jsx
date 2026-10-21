/**
 * Current nominees (DPDP Act s.14; Rule 14(4): from about May 2027). Stored as NOMINATION
 * requests; the latest per person is current. Check the nominee's identity and proof of
 * death or incapacity before acting on their request.
 */
import prisma from 'lib/db';
import { nomineeFromRequest } from 'lib/rights';
import { adminProps, noStore } from 'lib/adminData';
import { PATIENT_SELECT, patientOf } from 'lib/patients';
import AdminLayout from 'components/AdminLayout';
import PatientRef from 'components/PatientRef';

const Nominations = ({ admin, permissions, denied, nominations = [] }) => (
  <AdminLayout title="Nominations" admin={admin} permissions={permissions} denied={denied}>
    <div className="table-responsive">
      <table className="table table-sm fs-14">
        <thead>
          <tr>
            <th>Data Principal</th>
            <th>Nominee</th>
            <th>Relationship</th>
            <th>Contact</th>
            <th>Since</th>
            <th>Current</th>
          </tr>
        </thead>
        <tbody>
          {nominations.map((n) => (
            <tr key={n.id} className={n.current ? '' : 'text-muted'}>
              <td>
                <PatientRef patient={n.patient} />
              </td>
              <td>{n.name}</td>
              <td>{n.relationship}</td>
              <td>{n.contact}</td>
              <td>{new Date(n.since).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              <td>{n.current ? 'Yes' : 'Replaced'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!nominations.length && <p>No nominations.</p>}
  </AdminLayout>
);

export const getServerSideProps = adminProps('nominations', async ({ res }) => {
  noStore(res);
  const rows = await prisma.rightsRequest.findMany({
    where: { type: 'NOMINATION', payload: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { dataPrincipal: { select: PATIENT_SELECT } }
  });
  const seen = new Set();
  const nominations = rows
    .map((r) => {
      const nominee = nomineeFromRequest(r);
      if (!nominee) return null;
      const current = !seen.has(r.dataPrincipalId);
      seen.add(r.dataPrincipalId);
      return { id: r.id, patient: patientOf(r.dataPrincipal), current, ...nominee };
    })
    .filter(Boolean);
  return { entity: 'RightsRequest', viewed: nominations.map((n) => n.id), props: { nominations } };
});

export default Nominations;
