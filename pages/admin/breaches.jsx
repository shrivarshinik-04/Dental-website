/**
 * Incident register, connected to the written procedure in docs/BREACH-RESPONSE.md and its
 * named owner (INCIDENT_OWNER).
 * Now: CERT-In Directions 2022 — report within 6 hours of noticing (countdown + draft).
 * From about May 2027: DPDP Act s.8(6), DPDP Rules Rule 7 — Board and individual
 * intimations and the 72-hour detailed report (drafts + countdown, labelled as future).
 * Records when each report was sent.
 */
import { useRouter } from 'next/router';
import prisma from 'lib/db';
import { adminProps, noStore } from 'lib/adminData';
import { INCIDENT_OWNER } from 'config/compliance';
import { certInDueAt, draftBoardDetailedReport, draftBoardIntimation, draftCertInReport, draftPrincipalNotice } from 'lib/breach';
import SampleBadge from 'components/SampleBadge';
import { postJson } from 'lib/api';
import AdminLayout from 'components/AdminLayout';
import BreachForm from 'components/BreachForm';
import Countdown from 'components/Countdown';

const MILESTONES = [
  ['certInReportedAt', 'Report to CERT-In within 6 hours of noticing (CERT-In Directions 2022 — in force)', 'certInDraft'],
  ['boardIntimatedAt', 'Initial intimation to the Data Protection Board (DPDP Rule 7(2)(a) — from about May 2027)', 'boardDraft'],
  ['principalsIntimatedAt', 'Intimation to affected individuals (DPDP Rule 7(1) — from about May 2027)', 'principalDraft'],
  ['detailedReportSentAt', 'Detailed report to the Board within 72 hours (DPDP Rule 7(2)(b) — from about May 2027)', 'reportDraft']
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
      <div className="border rounded p-3 mb-4 fs-15">
        <p className="mb-1">
          <strong>Incident owner and CERT-In Point of Contact:</strong> {INCIDENT_OWNER.name}, {INCIDENT_OWNER.email},{' '}
          {INCIDENT_OWNER.phone} <SampleBadge />
        </p>
        <p className="mb-0">
          Follow the written procedure in <code>docs/BREACH-RESPONSE.md</code>: contain, preserve evidence, record the
          incident here as soon as it is noticed, report to CERT-In within 6 hours, then complete the remaining steps.
        </p>
      </div>
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
              Detected {new Date(incident.detectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}: {incident.nature}
            </h2>
            <span className="badge bg-secondary align-self-start">{incident.status}</span>
          </div>
          <p className="mb-1">
            CERT-In report due {new Date(incident.certInDueAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
            <Countdown due={incident.certInDueAt} done={Boolean(incident.certInReportedAt)} warnHours={6} />
          </p>
          <p className="mb-2 fs-14">
            From about May 2027: detailed report to the Board due {new Date(incident.detailedReportDueAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
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
                  <span className="badge bg-success">Sent {new Date(incident[field]).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
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
          {incident.status !== 'CLOSED' && incident.certInReportedAt && (
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
        certInDueAt: certInDueAt(incident),
        certInDraft: draftCertInReport(incident),
        boardDraft: draftBoardIntimation(incident),
        reportDraft: draftBoardDetailedReport(incident),
        principalDraft: draftPrincipalNotice(incident)
      }))
    }
  };
});

export default Breaches;
