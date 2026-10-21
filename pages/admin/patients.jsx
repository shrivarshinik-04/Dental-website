/**
 * Patients: every reference ID with the patient's name and, for a patient under 18, the parent
 * or guardian (from the Guardian table). Names are decrypted on the server for signed-in staff
 * only; they stay encrypted in the database. Each view is audited per patient and per guardian
 * (Rule 6(1)(c)).
 */
import prisma from 'lib/db';
import { decrypt } from 'lib/crypto';
import { adminProps, noStore } from 'lib/adminData';
import { auditMany } from 'lib/audit';
import { hashedIp } from 'lib/http';
import AdminLayout from 'components/AdminLayout';

const RELATIONSHIP = { PARENT: 'Parent', LEGAL_GUARDIAN: 'Legal guardian', MOTHER: 'Mother', FATHER: 'Father' };

const Patients = ({ admin, permissions, denied, patients = [] }) => (
  <AdminLayout title="Patients" admin={admin} permissions={permissions} denied={denied}>
    <p className="fs-15">
      Each patient has one reference ID. For a patient under 18 the parent or guardian who booked is listed with their
      contact details, which are used instead of the patient&apos;s.
    </p>
    <div className="table-responsive">
      <table className="table table-sm table-hover fs-14 align-middle">
        <thead>
          <tr>
            <th>Reference ID</th>
            <th>Patient name</th>
            <th>Mobile / email</th>
            <th>Under 18</th>
            <th>Parent or guardian</th>
            <th>Bookings</th>
            <th>Latest booking</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id}>
              <td className="fw-bold text-nowrap">{p.referenceId}</td>
              <td>{p.erased ? <em>erased</em> : p.name}</td>
              <td>{[p.phone, p.email].filter(Boolean).join(', ') || '—'}</td>
              <td>{p.minor ? 'Yes' : 'No'}</td>
              <td>
                {p.guardians.length
                  ? p.guardians.map((g) => (
                      <div key={g.id}>
                        {g.name} ({RELATIONSHIP[g.relationship] || g.relationship})
                        <br />
                        <span className="text-nowrap">{[g.phone, g.email].filter(Boolean).join(', ')}</span>
                      </div>
                    ))
                  : '—'}
              </td>
              <td>{p.bookings}</td>
              <td>{p.latest ? p.latest.slice(0, 10) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminLayout>
);

export const getServerSideProps = adminProps('appointments', async ({ req, res }, admin) => {
  noStore(res);
  const rows = await prisma.dataPrincipal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: {
      appointments: { select: { preferredDate: true, patientIsMinor: true }, orderBy: { preferredDate: 'desc' } },
      guardians: { orderBy: { createdAt: 'desc' } }
    }
  });
  // The same guardian on several bookings is listed once (latest details first).
  const patients = rows.map((p) => {
    const seen = new Set();
    const guardians = p.guardians
      .map((g) => ({ id: g.id, name: decrypt(g.name), relationship: decrypt(g.relationship), phone: decrypt(g.phone), email: decrypt(g.email) }))
      .filter((g) => {
        const key = `${g.name}|${g.relationship}|${g.phone}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return {
      id: p.id,
      referenceId: p.referenceId,
      erased: Boolean(p.erasedAt),
      name: decrypt(p.name),
      phone: decrypt(p.phone),
      email: decrypt(p.email),
      minor: p.appointments.some((a) => a.patientIsMinor),
      guardians,
      bookings: p.appointments.length,
      latest: p.appointments[0]?.preferredDate || null
    };
  });
  const shownGuardians = patients.flatMap((p) => p.guardians);
  if (shownGuardians.length) {
    const ipHash = hashedIp(req);
    await auditMany(shownGuardians.map((g) => ({ actor: `admin:${admin.username}`, action: 'READ', entity: 'Guardian', entityId: g.id, ipHash })));
  }
  return { entity: 'DataPrincipal', viewed: patients.map((p) => p.id), props: { patients } };
});

export default Patients;
