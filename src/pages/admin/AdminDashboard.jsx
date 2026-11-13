import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShoppingBag,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiMail,
  FiUsers,
  FiAlertTriangle,
  FiPackage,
  FiLoader,
} from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';
import { taka } from '../../components/ProductCard';

export default function AdminDashboard() {
  const { adminJson } = useAdmin();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminJson('/api/admin/stats')
      .then((data) => { setStats(data); setError(''); })
      .catch((e) => setError(e.message || 'Could not load dashboard. Is the API server running?'));
  }, [adminJson]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 30000); // live-ish refresh every 30s
    return () => window.clearInterval(t);
  }, [load]);

  if (error) {
    return (
      <div className="admin-page">
        <h1 className="admin-h1">Dashboard</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="admin-page admin-loading">
        <FiLoader className="spin" size={28} />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  const cards = [
    { label: "Today's orders", value: stats.todayOrders, sub: `৳${Number(stats.todayRevenue).toLocaleString('en-IN')} today`, icon: <FiTrendingUp />, tone: 'green' },
    { label: 'Active orders', value: stats.pendingOrders, sub: `${stats.confirmedOrders || 0} confirmed · ${stats.processingOrders || 0} processing`, icon: <FiClock />, tone: 'amber', link: '/admin/orders' },
    { label: 'Shipped', value: stats.shippedOrders, sub: 'on the way', icon: <FiTruck />, tone: 'violet', link: '/admin/orders' },
    { label: 'Delivered', value: stats.deliveredOrders, sub: 'complete', icon: <FiCheckCircle />, tone: 'green', link: '/admin/orders' },
    { label: 'Cancelled', value: stats.cancelledOrders, sub: `${stats.refundedOrders || 0} refunded`, icon: <FiXCircle />, tone: 'red', link: '/admin/orders' },
    { label: 'Total revenue', value: `৳${Number(stats.revenue).toLocaleString('en-IN')}`, sub: `${stats.totalOrders} orders all-time`, icon: <FiShoppingBag />, tone: 'dark' },
    { label: 'Unread messages', value: stats.unreadMessages, sub: 'contact form', icon: <FiMail />, tone: stats.unreadMessages > 0 ? 'red' : 'dark', link: '/admin/messages' },
    { label: 'Newsletter', value: stats.subscribers, sub: 'subscribers', icon: <FiUsers />, tone: 'dark', link: '/admin/subscribers' },
    { label: 'Products', value: stats.products, sub: stats.outOfStock > 0 ? `${stats.outOfStock} out of stock` : 'all in stock', icon: <FiPackage />, tone: stats.outOfStock > 0 ? 'amber' : 'dark', link: '/admin/products' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Dashboard</h1>
          <p className="admin-sub">Live overview of your store.</p>
        </div>
        <Link to="/admin/orders" className="admin-btn-primary"><FiShoppingBag size={15} /> Manage orders</Link>
      </div>

      <div className="admin-stat-grid">
        {cards.map((card) => {
          const inner = (
            <>
              <span className={`admin-stat-icon tone-${card.tone}`}>{card.icon}</span>
              <span className="admin-stat-body">
                <span className="admin-stat-label">{card.label}</span>
                <span className="admin-stat-value">{card.value}</span>
                <span className="admin-stat-sub">{card.sub}</span>
              </span>
            </>
          );
          return card.link ? (
            <Link key={card.label} to={card.link} className="admin-stat-card is-link">{inner}</Link>
          ) : (
            <div key={card.label} className="admin-stat-card">{inner}</div>
          );
        })}
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2><FiShoppingBag size={16} /> Recent orders</h2>
          <Link to="/admin/orders" className="admin-link">View all →</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th></tr>
            </thead>
            <tbody>
              {stats.recentOrders.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--hints-color)', padding: 28 }}>No orders yet — place a test order from the storefront to see it here.</td></tr>
              )}
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link to="/admin/orders" className="admin-link mono">{o.id}</Link></td>
                  <td>{o.customer.name}<br /><span className="admin-muted">{o.customer.phone}</span></td>
                  <td>{taka(o.total)}</td>
                  <td className="admin-uppercase">{o.payment}</td>
                  <td><span className={`order-status ${o.status}`}>{o.status}</span></td>
                  <td>{new Date(o.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {stats.outOfStock > 0 && (
        <p className="admin-warning"><FiAlertTriangle size={15} /> {stats.outOfStock} product(s) are out of stock — restock them in <Link to="/admin/products">Products</Link>.</p>
      )}
    </div>
  );
}
