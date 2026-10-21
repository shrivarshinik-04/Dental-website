/** "DP-XXXXXX" with the patient's name below it (staff pages only). */
const PatientRef = ({ patient, fallback = '—' }) => {
  if (!patient) return fallback;
  return (
    <span className="d-inline-block">
      <span className="fw-bold text-nowrap">{patient.referenceId}</span>
      <br />
      <span className="fs-14">{patient.erased ? <em>erased</em> : patient.name || '—'}</span>
    </span>
  );
};

export default PatientRef;
