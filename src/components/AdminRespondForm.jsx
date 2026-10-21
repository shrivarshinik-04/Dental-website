import { useState } from 'react';
import { useRouter } from 'next/router';
import { postJson } from 'lib/api';

/**
 * Small form to close a rights request or grievance with a response
 * (DPDP Rules 2025, Rule 14(3)). The Rule 9 contact person is appended to the
 * response server-side.
 */
const AdminRespondForm = ({ endpoint, id, statuses = ['IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED'] }) => {
  const router = useRouter();
  const [status, setStatus] = useState(statuses[1] || statuses[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await postJson(endpoint, { id, status, response: text });
      router.replace(router.asPath);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="d-flex flex-column gap-1" style={{ minWidth: 220 }}>
      <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="New status">
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <textarea
        className="form-control form-control-sm"
        rows={2}
        maxLength={2000}
        placeholder="Response to the Data Principal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <button type="submit" className="btn btn-sm bg-theme-dark text-white rounded" disabled={busy || !text.trim()}>
        Save
      </button>
    </form>
  );
};

export default AdminRespondForm;
