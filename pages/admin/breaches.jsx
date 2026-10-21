/**
 * Personal data breach register. DPDP Act s.8(6); DPDP Rules 2025, Rule 7:
 * - intimate the Board and each affected Data Principal without delay;
 * - send the Board a detailed report within 72 hours of becoming aware.
 * Shows the 72-hour countdown, generates draft intimations with all Rule 7(1)(a)–(e)
 * and 7(2) fields, and records when each one was sent.
 */
import { useRouter } from 'next/router';
import prisma from 'lib/db';
import { adminProps, noStore } from 'lib/adminData';
import { draftBoardDetailedReport, draftBoardIntimation, draftPrincipalNotice } from 'lib/breach';
import { postJson } from 'lib/api';
import AdminLayout from 'components/AdminLayout';
import BreachForm from 'components/BreachForm';
import Countdown from 'components/Countdown';

const MILESTONES = [
  ['boardIntimatedAt', 'Initial intimation to Board (without delay)', 'boardDraft'],
  ['principalsIntimatedAt', 'Intimation to affected Data Principals (without delay)', 'principalDraft'],
  ['detailedReportSentAt', 'Detailed report to Board (within 72 hours)', 'reportDraft']
];

const Breaches = ({ admin, permissions, denied, incidents = [] }) => {
  const router = useRouter();
  const mark = async (id, milestone) => {
    if (!window.confirm('Record this as sent now?')) return;
    try {
      await postJson('/api/admin/breaches', { id, action: 'mark', milestone });
      router.replace(router.asPath);
    } catch (err) {
      alert(err.message);
    }
  };
  const close = async (id) => {
    try {
      await postJson('/api/admin/breaches', { id, action: 'close' });
      router.replace(router.asPath);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout title="Breach incidents" admin={admin} permissions={permissions} denied={denied}>
      <details className="border rounded p-3 mb-6 bg-grays">
        <summary className="fw-bold">Record a new incident</summary>
        <div className="mt-3">
          <BreachForm />
        </div>
      </details>

      {incidents.map((incident) => (
        <section key={incident.id} className="border rounded p-4 mb-4 bg-white">
          <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
            <h2 className="fs-20 merriweather text-title mb-0">
              Detected {new Date(incident.detectedAt).toLocaleString('en-IN')}: {incident.nature}
            </h2>
            <span className="badge bg-secondary align-self-start">{incident.status}</span>
          </div>
          <p className="mb-2">
            Detailed report due {new Date(incident.detailedReportDueAt).toLocaleString('en-IN')}{' '}
            <Countdown due={incident.detailedReportDueAt} done={Boolean(incident.detailedReportSentAt)} warnHours={24} />
          </p>
          <p className="mb-3 fs-15">
            {incident.description} ({incident.affectedCount} affected)
          </p>

          {MILESTONES.map(([field, label, draft]) => (
            <div key={field} className="border-top py-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <strong>{label}</strong>
                {incident[field] ? (
                  <span className="badge bg-success">Sent {new Date(incident[field]).toLocaleString('en-IN')}</span>
                ) : (
                  <button type="button" className="btn btn-sm bg-theme-dark text-white rounded" onClick={() => mark(incident.id, field)}>
                    Mark as sent now
                  </button>
                )}
              </div>
              <details className="mt-2">
                <summary className="fs-14">View draft</summary>
                <pre className="bg-grays p-3 rounded fs-13 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                  {incident[draft]}
                </pre>
              </details>
            </div>
          ))}

          <details className="border-top pt-3">
            <summary className="fs-14">Edit incident details</summary>
            <div className="mt-3">
              <BreachForm incident={incident} />
            </div>
          </details>
          {incident.status !== 'CLOSED' && incident.detailedReportSentAt && incident.principalsIntimatedAt && (
            <button type="button" className="btn btn-sm btn-white border text-title rounded mt-3" onClick={() => close(incident.id)}>
              Close incident
            </button>
          )}
        </section>
      ))}
      {!incidents.length && <p>No incidents recorded.</p>}
    </AdminLayout>
  );
};

export const getServerSideProps = adminProps('breaches', async ({ res }) => {
  noStore(res);
  const rows = await prisma.breachIncident.findMany({ orderBy: { detectedAt: 'desc' }, take: 100 });
  return {
    entity: 'BreachIncident',
    viewed: rows.map((r) => r.id),
    props: {
      incidents: rows.map((incident) => ({
        ...incident,
        boardDraft: draftBoardIntimation(incident),
        reportDraft: draftBoardDetailedReport(incident),
        principalDraft: draftPrincipalNotice(incident)
      }))
    }
  };
});

export default Breaches;
