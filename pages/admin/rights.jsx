/**
 * Data Principal rights requests (DPDP Act s.11–s.14; Rule 14) with response-period
 * countdowns and overdue highlighting.
 */
import prisma from 'lib/db';
import { adminProps, noStore } from 'lib/adminData';
import { PATIENT_SELECT, patientOf } from 'lib/patients';
import AdminLayout from 'components/AdminLayout';
import AdminRespondForm from 'components/AdminRespondForm';
import Countdown from 'components/Countdown';
import PatientRef from 'components/PatientRef';

const OPEN = ['OPEN', 'IN_PROGRESS'];

const Rights = ({ admin, permissions, denied, requests = [] }) => (
  <AdminLayout title="Rights requests" admin={admin} permissions={permissions} denied={denied}>
    <p className="fs-15">
      Most requests are completed automatically through the portal. Requests still open (e.g. received by phone or
      email and entered manually) must be answered before the due date.
    </p>
    <div className="table-responsive">
      <table className="table table-sm fs-14 align-middle">
        <thead>
          <tr>
            <th>Received</th>
            <th>Patient</th>
            <th>Type</th>
            <th>Verified by</th>
            <th>Status</th>
            <th>Due</th>
            <th>Details</th>
            <th>Respond</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const open = OPEN.includes(r.status);
            const overdue = open && new Date(r.dueDate) < new Date();
            return (
              <tr key={r.id} className={overdue ? 'table-danger' : ''}>
                <td>{new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td>
                  <PatientRef patient={r.patient} fallback={r.identifierProvided} />
                </td>
                <td>{r.type}</td>
                <td>{r.verificationMethod}</td>
                <td>{r.status}</td>
                <td>
                  <Countdown due={r.dueDate} done={!open} warnHours={7 * 24} />
                </td>
                <td style={{ maxWidth: 260 }}>
                  <code className="fs-12 text-break">{r.payload || r.response}</code>
                </td>
                <td>{open && <AdminRespondForm endpoint="/api/admin/rights" id={r.id} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </AdminLayout>
);

export const getServerSideProps = adminProps('rights', async ({ res }) => {
  noStore(res);
  const rows = await prisma.rightsRequest.findMany({
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: 300,
    include: { dataPrincipal: { select: PATIENT_SELECT } }
  });
  const requests = rows.map(({ dataPrincipal, ...r }) => ({ ...r, patient: patientOf(dataPrincipal) }));
  return { entity: 'RightsRequest', viewed: requests.map((r) => r.id), props: { requests } };
});

export default Rights;
