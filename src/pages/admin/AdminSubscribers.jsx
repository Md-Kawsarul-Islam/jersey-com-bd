import { useCallback, useEffect, useState } from 'react';
import { FiUsers, FiDownload, FiRefreshCw, FiLoader, FiMail } from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';
import { useCart } from '../../context/CartContext';

export default function AdminSubscribers() {
  const { adminJson, adminFetch } = useAdmin();
  const { showToast } = useCart();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminJson('/api/admin/subscribers')
      .then((data) => { setSubscribers(data.subscribers); setError(''); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [adminJson]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    try {
      const res = await adminFetch('/api/admin/subscribers.csv');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subscribers.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('subscribers.csv downloaded');
    } catch (e) {
      showToast(e.message || 'Export failed');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Newsletter</h1>
          <p className="admin-sub">{subscribers.length} subscriber{subscribers.length === 1 ? '' : 's'} — collected via the footer signup.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="admin-btn-ghost" onClick={load} aria-label="Refresh">
            <FiRefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="admin-btn-primary" onClick={exportCsv} disabled={subscribers.length === 0}>
            <FiDownload size={15} /> Export CSV
          </button>
        </div>
      </div>

      {error && <div className="admin-error-box">{error} — is the API server running? (`npm run server`)</div>}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2><FiUsers size={16} /> Subscribers</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Email</th>
                <th>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30 }}><FiLoader className="spin" size={22} /></td></tr>}
              {!loading && subscribers.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40 }}>
                  <FiMail size={40} color="#d4d4d4" strokeWidth={1.2} />
                  <p style={{ color: 'var(--hints-color)', marginTop: 10 }}>No subscribers yet. Share the store link — every signup lands here.</p>
                </td></tr>
              )}
              {!loading && subscribers.map((s, i) => (
                <tr key={s.email}>
                  <td className="admin-muted">{subscribers.length - i}</td>
                  <td><a className="admin-link" href={`mailto:${s.email}`}>{s.email}</a></td>
                  <td className="admin-muted">{new Date(s.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
