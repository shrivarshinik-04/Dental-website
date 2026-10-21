/**
 * Grievances (DPDP Act s.13) with the ≤ 90-day response countdown (Rule 14(3)) and
 * overdue highlighting.
 */
import { Fragment } from 'react';
import prisma from 'lib/db';
import { decrypt } from 'lib/crypto';
import { adminProps, noStore } from 'lib/adminData';
import { PATIENT_SELECT, patientOf } from 'lib/patients';
import AdminLayout from 'components/AdminLayout';
import AdminRespondForm from 'components/AdminRespondForm';
import Countdown from 'components/Countdown';
import PatientRef from 'components/PatientRef';

const OPEN = ['OPEN', 'IN_PROGRESS'];

const Grievances = ({ admin, permissions, denied, grievances = [] }) => (
  <AdminLayout title="Grievances" admin={admin} permissions={permissions} denied={denied}>
    <div className="table-responsive">
      <table className="table table-sm fs-14 align-middle">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Received</th>
            <th>From</th>
            <th>Category</th>
            <th>Description</th>
            <th>Status</th>
            <th>Due</th>
            <th>Resolution</th>
          </tr>
        </thead>
        <tbody>
          {grievances.map((g) => {
            const open = OPEN.includes(g.status);
            const overdue = open && new Date(g.dueDate) < new Date();
            return (
              <tr key={g.id} className={overdue ? 'table-danger' : ''}>
                <td>{g.referenceNumber}</td>
                <td>{new Date(g.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td>
                  {g.verified ? (
                    <Fragment>
                      <PatientRef patient={g.patient} /> (verified)
                    </Fragment>
                  ) : (
                    `${g.contactName}, ${g.contactDetail} (unverified)`
                  )}
                </td>
                <td>{g.category}</td>
                <td style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{g.description}</td>
                <td>{g.status}</td>
                <td>
                  <Countdown due={g.dueDate} done={!open} warnHours={7 * 24} />
                </td>
                <td>{open ? <AdminRespondForm endpoint="/api/admin/grievances" id={g.id} /> : g.resolution}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </AdminLayout>
);

export const getServerSideProps = adminProps('grievances', async ({ res }) => {
  noStore(res);
  const rows = await prisma.grievance.findMany({
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: 300,
    include: { dataPrincipal: { select: PATIENT_SELECT } }
  });
  return {
    entity: 'Grievance',
    viewed: rows.map((g) => g.id),
    props: {
      grievances: rows.map((g) => ({
        id: g.id,
        referenceNumber: g.referenceNumber,
        createdAt: g.createdAt,
        verified: g.verified,
        patient: patientOf(g.dataPrincipal),
        contactName: decrypt(g.contactName),
        contactDetail: decrypt(g.contactDetail),
        category: g.category,
        description: decrypt(g.description),
        status: g.status,
        dueDate: g.dueDate,
        resolution: g.resolution
      }))
    }
  };
});

export default Grievances;
