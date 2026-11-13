import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { FiCheckCircle, FiPackage, FiTruck, FiLoader } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { taka } from '../components/ProductCard';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const location = useLocation();
  const { trackOrders, orders } = useCart();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const offline = location.state?.offline;

  useEffect(() => {
    if (order) return undefined;
    let cancelled = false;
    trackOrders(orderId).then((found) => {
      if (cancelled) return;
      const match = found.find((o) => o.id === orderId) || orders.find((o) => o.id === orderId) || null;
      setOrder(match);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, order, orders, trackOrders]);

  return (
    <main className="container section-padding">
      <div className="order-success">
        <FiCheckCircle size={72} color="var(--success-color)" strokeWidth={1.4} />
        <h1 style={{ fontSize: 24, margin: '18px 0 6px', color: 'var(--title-color)' }}>
          Order placed successfully!
        </h1>
        <p style={{ color: 'var(--hints-color)', margin: 0 }}>
          Thank you for shopping with Jersey.com.bd 🎉
        </p>
        {offline && (
          <p style={{ color: '#d97706', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
            Saved on this device only — the server was unreachable at checkout time.
            Call us with your Order ID to make sure we have it.
          </p>
        )}

        <div style={{ background: 'var(--off-white-color)', borderRadius: 12, padding: '16px 18px', margin: '22px 0', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--hints-color)', fontSize: 13 }}>Order ID</span>
            <strong style={{ fontSize: 15, letterSpacing: 1 }}>{orderId}</strong>
          </div>
          {loading && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--hints-color)', fontSize: 13 }}>
              <FiLoader /> Fetching order details…
            </p>
          )}
          {order && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
                <span style={{ color: 'var(--hints-color)', fontSize: 13 }}>Total</span>
                <strong>{taka(order.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
                <span style={{ color: 'var(--hints-color)', fontSize: 13 }}>Payment</span>
                <strong>{order.payment === 'cod' ? 'Cash on Delivery' : String(order.payment).toUpperCase()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
                <span style={{ color: 'var(--hints-color)', fontSize: 13 }}>Items</span>
                <strong>{order.items.reduce((n, i) => n + i.qty, 0)} jersey(s)</strong>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, color: 'var(--body-color)', marginBottom: 22 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiPackage /> Order confirmed</span>→
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiTruck /> Packed &amp; dispatched</span>→
          <span>Delivered in 1–5 days</span>
        </div>

        {order?.customer?.phone && (
          <p style={{ fontSize: 13, color: 'var(--body-color)' }}>
            We’ll call <strong>{order.customer.phone}</strong> shortly to confirm.
            Save your Order ID to track it anytime.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <Link className="btn-primary" to={`/track/order?id=${orderId}`}>Track my order</Link>
          <Link className="btn-outline" to="/shop">Continue shopping</Link>
        </div>
      </div>
    </main>
  );
}
