import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiSearch,
  FiTrash2,
  FiLoader,
  FiChevronDown,
  FiRefreshCw,
  FiShoppingBag,
  FiPhone,
  FiMapPin,
  FiAlertCircle,
  FiDownload,
  FiFileText,
  FiPlus,
  FiEdit3,
  FiEye,
} from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductsContext';
import { taka } from '../../components/ProductCard';
import { ORDER_STATUSES, STATUS_LABEL } from './orderStatuses';
import OrderForm from './OrderForm';

export default function AdminOrders() {
  const { adminJson } = useAdmin();
  const { showToast } = useCart();
  const { catalog } = useProducts();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [formOrder, setFormOrder] = useState(undefined); // undefined = closed | null = new | order = edit

  const catalogBySlug = useMemo(() => {
    const map = {};
    for (const p of catalog) map[p.slug] = p;
    return map;
  }, [catalog]);

  const downloadReceipt = useCallback(
    async (order) => {
      setDownloadingId(order.id);
      try {
        const { generateReceiptPdf } = await import('../../utils/receipt');
        const filename = await generateReceiptPdf(order, { catalogBySlug });
        showToast(`Downloading ${filename}`);
      } catch (e) {
        console.error('Receipt generation failed', e);
        showToast('Could not generate the receipt PDF');
      } finally {
        setDownloadingId(null);
      }
    },
    [catalogBySlug, showToast]
  );

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    adminJson(`/api/admin/orders?${params.toString()}`)
      .then((data) => { setOrders(data.orders); setError(''); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [adminJson, statusFilter, search]);

  useEffect(() => {
    const t = window.setTimeout(load, search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  const counts = useMemo(
    () => orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {}),
    [orders]
  );

  const changeStatus = async (order, newStatus) => {
    if (newStatus === order.status) return;
    if (newStatus === 'cancelled' && !window.confirm(`Cancel order ${order.id}? All its products return to stock.`)) return;
    setSavingId(order.id);
    try {
      const data = await adminJson(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order : o)));
      showToast(`Order ${order.id} → ${STATUS_LABEL[newStatus] || newStatus}`);
    } catch (e) {
      showToast(e.message || 'Could not update status');
    } finally {
      setSavingId(null);
    }
  };

  const removeOrder = async (order) => {
    if (!window.confirm(`Permanently delete order ${order.id}?\n\nItems will be returned to stock${order.status === 'cancelled' ? ' (they were already restored)' : ''}.`)) return;
    try {
      await adminJson(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      showToast(`Order ${order.id} deleted`);
    } catch (e) {
      showToast(e.message || 'Could not delete the order');
    }
  };

  const handleSaved = useCallback((savedOrder) => {
    setFormOrder(undefined);
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === savedOrder.id);
      return exists
        ? prev.map((o) => (o.id === savedOrder.id ? savedOrder : o))
        : [savedOrder, ...prev];
    });
    setExpanded(savedOrder.id);
  }, []);

  const handleDeleted = useCallback((deletedId) => {
    setFormOrder(undefined);
    setOrders((prev) => prev.filter((o) => o.id !== deletedId));
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Orders</h1>
          <p className="admin-sub">Create, edit, refund and track every order — changes go live instantly.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="admin-btn-ghost" onClick={load} aria-label="Refresh orders">
            <FiRefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="admin-btn-primary" onClick={() => setFormOrder(null)}>
            <FiPlus size={15} /> New Order
          </button>
        </div>
      </div>

      {/* filter tabs */}
      <div className="admin-filter-row" role="tablist" aria-label="Filter by status">
        {['all', ...ORDER_STATUSES].map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={statusFilter === s}
            className={`admin-filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
            {s !== 'all' && <span className="admin-chip-count">{counts[s] || 0}</span>}
          </button>
        ))}
        <div className="admin-search-box">
          <FiSearch size={15} />
          <input
            placeholder="Search id, phone, name, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </div>
      </div>

      {error && <div className="admin-error-box"><FiAlertCircle size={15} /> {error} — is the API server running? (`npm run server`)</div>}

      {/* table */}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Placed</th>
                <th style={{ width: 116 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 34, color: 'var(--hints-color)' }}><FiLoader className="spin" size={22} /></td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 44 }}>
                    <FiShoppingBag size={40} color="#d4d4d4" strokeWidth={1.2} />
                    <p style={{ color: 'var(--hints-color)', marginTop: 10 }}>No orders found{search ? ` for “${search}”` : ''}.</p>
                    <button className="admin-btn-primary" style={{ marginTop: 12 }} onClick={() => setFormOrder(null)}>
                      <FiPlus size={15} /> Create the first order
                    </button>
                  </td>
                </tr>
              )}
              {!loading && orders.map((o) => {
                const open = expanded === o.id;
                const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
                return (
                  <Fragment key={o.id}>
                    <tr className={open ? 'admin-row-open' : ''}>
                      <td>
                        <button
                          className="admin-expand-btn"
                          aria-label={open ? 'Hide details' : 'Show order details'}
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : o.id)}
                        >
                          <FiChevronDown style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
                        </button>
                      </td>
                      <td><span className="mono admin-strong">{o.id}</span></td>
                      <td>
                        <span className="admin-strong">{o.customer.name}</span><br />
                        <a className="admin-muted admin-link" href={`tel:${o.customer.phone}`}><FiPhone size={11} /> {o.customer.phone}</a>
                      </td>
                      <td>{itemCount}× ({o.items.length})</td>
                      <td className="admin-strong">{taka(o.total)}</td>
                      <td className="admin-uppercase">{o.payment}</td>
                      <td>
                        <div className="admin-status-cell">
                          {savingId === o.id ? (
                            <FiLoader className="spin" size={16} />
                          ) : (
                            <select
                              className={`admin-status-select status-${o.status}`}
                              value={o.status}
                              onChange={(e) => changeStatus(o, e.target.value)}
                              aria-label={`Status of order ${o.id}`}
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="admin-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(o.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            className="admin-icon-btn"
                            onClick={() => setExpanded(open ? null : o.id)}
                            aria-label="View order details"
                            title="View details"
                          >
                            <FiEye size={15} />
                          </button>
                          <button
                            className="admin-icon-btn"
                            onClick={() => setFormOrder(o)}
                            aria-label={`Edit order ${o.id}`}
                            title="Edit order"
                          >
                            <FiEdit3 size={15} />
                          </button>
                          <button
                            className="admin-icon-btn"
                            onClick={() => downloadReceipt(o)}
                            disabled={downloadingId === o.id}
                            aria-label={`Download receipt for order ${o.id}`}
                            title="Download receipt (PDF)"
                          >
                            {downloadingId === o.id ? <FiLoader className="spin" size={15} /> : <FiDownload size={15} />}
                          </button>
                          <button
                            className="admin-icon-btn danger"
                            onClick={() => removeOrder(o)}
                            aria-label={`Delete order ${o.id}`}
                            title="Delete order"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="admin-detail-row">
                        <td colSpan={9}>
                          <div className="admin-detail-grid">
                            <div>
                              <p className="admin-detail-title">Items</p>
                              {o.items.map((item) => (
                                <div key={item.lineId} className="admin-detail-item">
                                  {item.image ? (
                                    <img src={item.image} alt="" />
                                  ) : (
                                    <span className="admin-detail-custom-dot" />
                                  )}
                                  <span className="admin-detail-item-name">
                                    {item.name}{item.size ? ` — Size: ${item.size}` : ''}
                                  </span>
                                  <span className="admin-muted">× {item.qty}</span>
                                  <span className="admin-strong">{taka(item.price * item.qty)}</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="admin-detail-title">Delivery</p>
                              <p className="admin-detail-line"><FiMapPin size={13} /> {o.customer.address}</p>
                              <p className="admin-detail-line">Zone: {o.zone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'} · Delivery: {o.delivery === 0 ? 'FREE' : taka(o.delivery)}</p>
                              {o.note && <p className="admin-detail-line admin-note">Note: {o.note}</p>}
                              <div className="admin-detail-totals">
                                {o.discount > 0 && <span>Saved {taka(o.discount)}</span>}
                                <span>Subtotal {taka(o.subtotal)}</span>
                                <span>Delivery {o.delivery === 0 ? 'FREE' : taka(o.delivery)}</span>
                                <strong>Total {taka(o.total)}</strong>
                              </div>
                              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                                <a className="admin-btn-ghost" href={`https://wa.me/${o.customer.phone.replace(/^0/, '880')}?text=${encodeURIComponent(`Hello ${o.customer.name}, this is Jersey.com.bd about your order ${o.id}.`)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                  <FiPhone size={13} /> WhatsApp customer
                                </a>
                                <button className="admin-btn-ghost" onClick={() => setFormOrder(o)}>
                                  <FiEdit3 size={13} /> Edit order
                                </button>
                                <button className="admin-btn-primary" style={{ fontSize: 12, padding: '9px 14px' }} onClick={() => downloadReceipt(o)} disabled={downloadingId === o.id}>
                                  {downloadingId === o.id ? <FiLoader className="spin" size={13} /> : <FiFileText size={13} />}
                                  {downloadingId === o.id ? 'Generating…' : 'Download Receipt (PDF)'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* create / edit modal */}
      {formOrder !== undefined && (
        <OrderForm
          initialOrder={formOrder}
          onClose={() => setFormOrder(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
