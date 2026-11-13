import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiPackage, FiCheckCircle, FiLoader } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { taka } from '../components/ProductCard';

const STEPS = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
const STEP_INDEX = { pending: 0, confirmed: 1, processing: 2, shipped: 2, dispatched: 2, delivered: 3, cancelled: -1, refunded: -2 };

export default function TrackOrder() {
  const { trackOrders, orders } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('id') || '');
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);

  const runTrack = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setResults(null);
    const found = await trackOrders(trimmed);
    setResults(found);
    setLoading(false);
  };

  // auto-search when landing with ?id=
  useEffect(() => {
    const initial = searchParams.get('id');
    if (initial) {
      setQuery(initial);
      runTrack(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const v = query.trim();
    setSearchParams(v ? { id: v } : {}, { replace: true });
    runTrack(v);
  };

  const stepIndexFor = (status) => STEP_INDEX[status] ?? 0;

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">Track Order</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>Track Order</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding" style={{ maxWidth: 860 }}>
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, marginBottom: 26 }} role="search">
          <input
            className="form-control"
            style={{ height: 52, fontSize: 15 }}
            placeholder="Enter Order ID (e.g. JBD1234567890) or phone number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Order ID or phone number"
            required
          />
          <button type="submit" className="btn-primary" style={{ height: 52 }} disabled={loading}>
            {loading ? <FiLoader className="spin" /> : <FiSearch />} Track
          </button>
        </form>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--hints-color)' }}>Looking up your order…</p>
        )}

        {results && results.length === 0 && !loading && (
          <div className="empty-state" style={{ paddingTop: 20 }}>
            <FiPackage size={64} color="#ccc" strokeWidth={1.2} />
            <h2>No order found</h2>
            <p>
              We couldn’t find an order for “{query.trim()}”.<br />
              Double-check the Order ID or the phone number used at checkout.<br />
              Still stuck? Call us at{' '}
              <a href="tel:+8801989454658" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>+880 1989 454 658</a>
            </p>
          </div>
        )}

        {results && results.map((order) => {
          const cancelled = order.status === 'cancelled';
          const refunded = order.status === 'refunded';
          const idx = stepIndexFor(order.status);
          return (
            <div className="order-item" key={order.id}>
              <div className="order-item-head">
                <div>
                  <strong style={{ fontSize: 16, letterSpacing: 1 }}>{order.id}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--hints-color)' }}>
                    Placed on {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <span className={`order-status ${order.status}`}>{order.status}</span>
              </div>

              {!cancelled && !refunded && (
                <div className="track-timeline" aria-label="Delivery progress">
                  {STEPS.map((step, i) => (
                    <div key={step} className={`track-step ${i <= idx ? 'done' : ''}`}>
                      {step}
                    </div>
                  ))}
                </div>
              )}
              {cancelled && (
                <p style={{ color: 'var(--alert-color)', fontWeight: 700, marginTop: 14 }}>
                  This order was cancelled.
                </p>
              )}
              {refunded && (
                <p style={{ color: '#475569', fontWeight: 700, marginTop: 14 }}>
                  This order was refunded — the amount has been returned.
                </p>
              )}

              <div style={{ marginTop: 14, borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                {order.items.map((i) => (
                  <div key={`${i.slug}-${i.size}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0' }}>
                    <img src={i.image} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6 }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{i.name} {i.size ? `(${i.size})` : ''} × {i.qty}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{taka(i.price * i.qty)}</span>
                  </div>
                ))}
                <div className="cart-totals-row grand" style={{ borderTop: '1px dashed #e5e5e5', paddingTop: 12 }}>
                  <span>Total ({order.payment === 'cod' ? 'Cash on Delivery' : order.payment.toUpperCase()})</span>
                  <span>{taka(order.total)}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--hints-color)', margin: '10px 0 0' }}>
                  <FiCheckCircle size={12} style={{ verticalAlign: '-1px' }} /> Delivering to: {order.customer.address}
                </p>
                {order.note && (
                  <p style={{ fontSize: 12, color: 'var(--hints-color)', margin: '6px 0 0' }}>
                    Note: {order.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {!results && orders.length > 0 && !loading && (
          <>
            <h2 style={{ fontSize: 15, color: 'var(--title-color)', margin: '8px 0 12px' }}>Recent orders saved on this device</h2>
            {orders.map((o) => (
              <button
                key={o.id}
                className="order-item"
                style={{ width: '100%', textAlign: 'left', background: '#fff', cursor: 'pointer' }}
                onClick={() => { setQuery(o.id); setSearchParams({ id: o.id }); runTrack(o.id); }}
              >
                <div className="order-item-head">
                  <span style={{ fontWeight: 700, letterSpacing: 1 }}>{o.id}</span>
                  <span className={`order-status ${o.status}`}>{o.status}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--hints-color)' }}>
                  {new Date(o.createdAt).toLocaleDateString('en-GB')} · {o.items.length} item(s) · {taka(o.total)} · saved offline
                </p>
              </button>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
