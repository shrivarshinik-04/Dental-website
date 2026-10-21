/**
 * Appointments (decrypted for authorised staff only). Every page view writes a READ
 * audit entry per appointment shown (Rule 6(1)(c)). Staff mark visits that form part of
 * the clinical record, which blocks erasure (s.8(7)).
 */
import { useRouter } from 'next/router';
import prisma from 'lib/db';
import { decrypt } from 'lib/crypto';
import { adminProps, noStore } from 'lib/adminData';
import { auditMany } from 'lib/audit';
import { hashedIp } from 'lib/http';
import { postJson } from 'lib/api';
import AdminLayout from 'components/AdminLayout';

const STATUSES = ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const Appointments = ({ admin, permissions, denied, appointments = [] }) => {
  const router = useRouter();
  const update = async (id, change) => {
    try {
      await postJson('/api/admin/appointments', { id, ...change });
      router.replace(router.asPath);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout title="Appointments" admin={admin} permissions={permissions} denied={denied}>
      <div className="table-responsive">
        <table className="table table-sm table-hover fs-14 align-middle">
          <thead>
            <tr>
              <th>Date</th>
              <th>Slot</th>
              <th>Ref</th>
              <th>Patient</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Reason</th>
              <th>Minor / guardian</th>
              <th>Status</th>
              <th>Clinical record</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{a.preferredDate.slice(0, 10)}</td>
                <td>{a.preferredSlot}</td>
                <td>{a.referenceId}</td>
                <td>{a.name}</td>
                <td>{a.phone}</td>
                <td>{a.service}</td>
                <td style={{ maxWidth: 220 }}>{a.reason}</td>
                <td>
                  {a.patientIsMinor ? (
                    <>
                      Yes: {a.guardianName} ({a.guardianRelationship})
                      <br />
                      {a.guardianPhone}
                      {a.guardianEmail && (
                        <>
                          <br />
                          {a.guardianEmail}
                        </>
                      )}
                    </>
                  ) : (
                    'No'
                  )}
                </td>
                <td>
                  <select
                    className="form-select form-select-sm"
                    value={a.status}
                    aria-label="Status"
                    onChange={(e) => update(a.id, { status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={a.legallyRequired}
                      aria-label="Part of the clinical record"
                      onChange={(e) => update(a.id, { legallyRequired: e.target.checked })}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!appointments.length && <p>No appointments.</p>}
    </AdminLayout>
  );
};

export const getServerSideProps = adminProps('appointments', async ({ req, res }, admin) => {
  noStore(res);
  const rows = await prisma.appointment.findMany({
    orderBy: { preferredDate: 'desc' },
    take: 200,
    include: { dataPrincipal: { select: { referenceId: true, name: true, phone: true } } }
  });
  // Viewing a parent or guardian's details is logged separately from the booking itself.
  const minors = rows.filter((r) => r.patientIsMinor);
  if (minors.length) {
    const ipHash = hashedIp(req);
    await auditMany(minors.map((r) => ({ actor: `admin:${admin.username}`, action: 'READ', entity: 'GuardianDetails', entityId: r.id, ipHash })));
  }
  return {
    entity: 'Appointment',
    viewed: rows.map((r) => r.id),
    props: {
      appointments: rows.map((a) => ({
        id: a.id,
        preferredDate: a.preferredDate,
        preferredSlot: a.preferredSlot,
        referenceId: a.dataPrincipal.referenceId,
        name: decrypt(a.dataPrincipal.name),
        phone: decrypt(a.dataPrincipal.phone),
        service: decrypt(a.service),
        reason: decrypt(a.notes),
        patientIsMinor: a.patientIsMinor,
        guardianName: decrypt(a.guardianName),
        guardianRelationship: decrypt(a.guardianRelationship),
        guardianPhone: decrypt(a.guardianPhone),
        guardianEmail: decrypt(a.guardianEmail),
        status: a.status,
        legallyRequired: a.legallyRequired
      }))
    }
  };
});

export default Appointments;
