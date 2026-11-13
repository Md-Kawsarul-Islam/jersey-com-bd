import { useCallback, useEffect, useState } from 'react';
import {
  FiMail,
  FiPhone,
  FiTrash2,
  FiCheck,
  FiLoader,
  FiRefreshCw,
  FiMail as FiMailIcon,
  FiInbox,
} from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';
import { useCart } from '../../context/CartContext';

export default function AdminMessages() {
  const { adminJson } = useAdmin();
  const { showToast } = useCart();
  const [messages, setMessages] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = unreadOnly ? '?unread=1' : '';
    adminJson(`/api/admin/messages${params}`)
      .then((data) => { setMessages(data.messages); setError(''); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [adminJson, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRead = async (msg) => {
    try {
      const data = await adminJson(`/api/admin/messages/${msg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: !msg.read }),
      });
      setMessages((prev) =>
        unreadOnly && data.message.read
          ? prev.filter((m) => m.id !== msg.id)
          : prev.map((m) => (m.id === msg.id ? data.message : m))
      );
    } catch (e) {
      showToast(e.message || 'Could not update the message');
    }
  };

  const removeMessage = async (msg) => {
    if (!window.confirm(`Delete message from ${msg.name}?`)) return;
    try {
      await adminJson(`/api/admin/messages/${msg.id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      showToast('Message deleted');
    } catch (e) {
      showToast(e.message || 'Could not delete the message');
    }
  };

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Messages</h1>
          <p className="admin-sub">Everything customers sent through the contact form{unread > 0 ? ` — ${unread} unread` : ''}.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`admin-filter-chip ${unreadOnly ? 'active' : ''}`}
            onClick={() => setUnreadOnly((v) => !v)}
            aria-pressed={unreadOnly}
          >
            Unread only
          </button>
          <button className="admin-btn-ghost" onClick={load} aria-label="Refresh messages">
            <FiRefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="admin-error-box">{error} — is the API server running? (`npm run server`)</div>}

      {!loading && messages.length === 0 && (
        <div className="admin-empty">
          <FiInbox size={48} color="#d4d4d4" strokeWidth={1.2} />
          <h2>No messages{unreadOnly ? ' unread' : ''}</h2>
          <p>When customers write to you via the contact form, their messages land here.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {messages.map((m) => {
          const open = expanded === m.id;
          return (
            <article key={m.id} className={`admin-message ${m.read ? '' : 'unread'}`}>
              <div className="admin-message-head">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <span className="admin-message-avatar">{m.name.trim().charAt(0).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong className="admin-message-name">{m.name}</strong>
                    <a href={`tel:${m.phone}`} className="admin-muted admin-message-phone"><FiPhone size={11} /> {m.phone}</a>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span className="admin-message-date">{new Date(m.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <button className="admin-icon-btn" onClick={() => toggleRead(m)} title={m.read ? 'Mark as unread' : 'Mark as read'} aria-label={m.read ? 'Mark as unread' : 'Mark as read'}>
                    {m.read ? <FiCheck size={15} style={{ color: 'var(--success-color)' }} /> : <FiMailIcon size={15} />}
                  </button>
                  <button className="admin-icon-btn danger" onClick={() => removeMessage(m)} title="Delete message" aria-label="Delete message">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
              {m.subject && <p className="admin-message-subject">{m.subject}</p>}
              <button className="admin-message-body" onClick={() => setExpanded(open ? null : m.id)} aria-expanded={open}>
                <span style={{ whiteSpace: open ? 'pre-wrap' : 'nowrap', overflow: open ? 'visible' : 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {m.message}
                </span>
                {!open && m.message.length > 140 && <span className="admin-link" style={{ fontSize: 12 }}>Read more…</span>}
              </button>
              <a
                className="admin-btn-ghost"
                style={{ marginTop: 10, display: 'inline-flex', fontSize: 12 }}
                href={`https://wa.me/${m.phone.replace(/^0/, '880')}?text=${encodeURIComponent(`Hello ${m.name}, this is Jersey.com.bd regarding your message: "${m.message.slice(0, 120)}"`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiPhone size={12} /> Reply on WhatsApp
              </a>
            </article>
          );
        })}
      </div>
      {loading && <div className="admin-loading"><FiLoader className="spin" size={24} /><p>Loading messages…</p></div>}
    </div>
  );
}
