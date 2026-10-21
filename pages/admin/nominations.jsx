/**
 * Nominations (DPDP Act s.14; Rule 14(4)). Check the nominee's identity and proof of
 * death or incapacity before acting on their request.
 */
import prisma from 'lib/db';
import { decrypt } from 'lib/crypto';
import { adminProps, noStore } from 'lib/adminData';
import AdminLayout from 'components/AdminLayout';

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
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {nominations.map((n) => (
            <tr key={n.id} className={n.active ? '' : 'text-muted'}>
              <td>{n.referenceId}</td>
              <td>{n.nomineeName}</td>
              <td>{n.relationship}</td>
              <td>{n.contact}</td>
              <td>{new Date(n.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              <td>{n.active ? 'Yes' : 'Replaced'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminLayout>
);

export const getServerSideProps = adminProps('nominations', async ({ res }) => {
  noStore(res);
  const rows = await prisma.nomination.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { dataPrincipal: { select: { referenceId: true } } }
  });
  return {
    entity: 'Nomination',
    viewed: rows.map((n) => n.id),
    props: {
      nominations: rows.map((n) => ({
        id: n.id,
        referenceId: n.dataPrincipal.referenceId,
        nomineeName: decrypt(n.nomineeName),
        relationship: decrypt(n.relationship),
        contact: decrypt(n.contact),
        createdAt: n.createdAt,
        active: n.active
      }))
    }
  };
});

export default Nominations;
