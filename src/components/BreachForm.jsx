import { useState } from 'react';
import { useRouter } from 'next/router';
import { postJson } from 'lib/api';
import { CERTIN_INCIDENT_TYPES } from 'lib/breach';

/**
 * Records or updates an incident with the details needed for the CERT-In report (now) and
 * the DPDP Rules 2025, Rule 7 intimations (from about May 2027).
 */
const FIELDS = [
  ['description', 'Description of the breach', true],
  ['nature', 'Nature (e.g. unauthorised access, loss, disclosure)', true],
  ['extent', 'Extent (what data, which systems)', true],
  ['location', 'Location (system / premises where it occurred)', false],
  ['likelyImpact', 'Likely impact (Rule 7(2)(a))', false],
  ['consequencesForPrincipals', 'Consequences for Data Principals (Rule 7(1)(b))', false],
  ['mitigation', 'Mitigation measures taken / proposed (Rule 7(1)(c), 7(2)(b)(ii))', false],
  ['safetyMeasuresForPrincipals', 'Safety measures Data Principals can take (Rule 7(1)(d))', false],
  ['rootCause', 'Facts, circumstances and reasons (Rule 7(2)(b)(i))', false],
  ['responsibleFindings', 'Findings on who caused it (Rule 7(2)(b)(iii))', false],
  ['remedialMeasures', 'Remedial measures to prevent recurrence (Rule 7(2)(b)(iv))', false]
];

const toLocalInput = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

const BreachForm = ({ incident }) => {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    detectedAt: toLocalInput(incident?.detectedAt) || toLocalInput(new Date().toISOString()),
    occurredAt: toLocalInput(incident?.occurredAt),
    affectedCount: incident?.affectedCount ?? 0,
    incidentType: incident?.incidentType || '',
    ...Object.fromEntries(FIELDS.map(([key]) => [key, incident?.[key] || '']))
  }));
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await postJson('/api/admin/breaches', {
        ...(incident && { id: incident.id, action: 'update' }),
        ...form,
        detectedAt: new Date(form.detectedAt).toISOString(),
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
        affectedCount: Number(form.affectedCount),
        incidentType: form.incidentType || null
      });
      router.replace(router.asPath);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const prefix = incident ? incident.id : 'new';

  return (
    <form onSubmit={submit} className="row g-3">
      <div className="col-md-4">
        <label className="form-label" htmlFor={`${prefix}-detectedAt`}>
          Detected at (we became aware) *
        </label>
        <input
          id={`${prefix}-detectedAt`}
          type="datetime-local"
          className="form-control"
          value={form.detectedAt}
          onChange={(e) => setForm({ ...form, detectedAt: e.target.value })}
          required
        />
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor={`${prefix}-occurredAt`}>
          Occurred at (if known)
        </label>
        <input
          id={`${prefix}-occurredAt`}
          type="datetime-local"
          className="form-control"
          value={form.occurredAt}
          onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor={`${prefix}-affectedCount`}>
          Data Principals affected *
        </label>
        <input
          id={`${prefix}-affectedCount`}
          type="number"
          min={0}
          className="form-control"
          value={form.affectedCount}
          onChange={(e) => setForm({ ...form, affectedCount: e.target.value })}
          required
        />
      </div>
      <div className="col-md-12">
        <label className="form-label" htmlFor={`${prefix}-incidentType`}>
          Incident type (CERT-In Directions, Annexure I)
        </label>
        <select
          id={`${prefix}-incidentType`}
          className="form-select"
          value={form.incidentType}
          onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
        >
          <option value="">—</option>
          {CERTIN_INCIDENT_TYPES.map(([code, label]) => (
            <option key={code} value={code}>
              {code}. {label}
            </option>
          ))}
        </select>
      </div>
      {FIELDS.map(([key, label, required]) => (
        <div className="col-md-6" key={key}>
          <label className="form-label" htmlFor={`${prefix}-${key}`}>
            {label}
            {required && ' *'}
          </label>
          <textarea
            id={`${prefix}-${key}`}
            className="form-control"
            rows={2}
            maxLength={4000}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            required={required}
          />
        </div>
      ))}
      <div className="col-12">
        <button type="submit" className="btn bg-theme-dark text-white rounded" disabled={busy}>
          {incident ? 'Save changes' : 'Record incident'}
        </button>
      </div>
    </form>
  );
};

export default BreachForm;
