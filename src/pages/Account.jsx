import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiUser, FiPackage, FiHeart, FiLogOut, FiChevronRight } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { taka } from '../components/ProductCard';

export default function Account() {
  const { user, logout, orders: localOrders, wishlist, trackOrders } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [serverOrders, setServerOrders] = useState(null); // null = loading
  const tab = searchParams.get('tab') === 'orders' ? 'orders' : 'profile';

  // Load orders for the signed-in phone from the server (fallback: offline orders saved on this device)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    trackOrders(user.phone).then((found) => {
      if (!cancelled) setServerOrders(found);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);

  const orders = serverOrders !== null && serverOrders.length > 0
    ? serverOrders
    : [...(serverOrders || []), ...localOrders];
  // de-duplicate (same id may exist in both)
  const seen = new Set();
  const myOrders = orders.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  if (!user) {
    return (
      <main className="container section-padding">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <FiUser size={48} color="var(--primary-color)" />
          <h1>You’re not signed in</h1>
          <p className="sub">Sign in or create an account to view your orders and wishlist.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn-primary" to="/login">Sign In</Link>
            <Link className="btn-outline" to="/register">Create Account</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">My Account</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>My Account</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding">
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start' }} className="account-grid">
          {/* sidebar */}
          <aside className="checkout-box" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, background: 'var(--off-white-color)', borderBottom: '1px solid #eee', display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src="/assets/avatar.png" alt="" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', background: '#fff' }} />
              <div>
                <strong style={{ fontSize: 15, color: 'var(--title-color)' }}>{user.name}</strong>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--hints-color)' }}>{user.phone}</p>
              </div>
            </div>
            {[
              { id: 'profile', label: 'My Profile', icon: <FiUser /> },
              { id: 'orders', label: `My Orders (${myOrders.length})`, icon: <FiPackage /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSearchParams(t.id === 'profile' ? {} : { tab: t.id }, { replace: true })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 20px', border: 'none', borderBottom: '1px solid #f2f2f2',
                  background: tab === t.id ? '#fff5f5' : '#fff',
                  color: tab === t.id ? 'var(--primary-color)' : 'var(--title-color)',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left',
                }}
              >
                {t.icon} {t.label} <FiChevronRight style={{ marginLeft: 'auto' }} />
              </button>
            ))}
            <Link to="/wishlist" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', color: 'var(--title-color)', fontWeight: 600, fontSize: 14, borderBottom: '1px solid #f2f2f2' }}>
              <FiHeart /> My Wishlist ({wishlist.length}) <FiChevronRight style={{ marginLeft: 'auto' }} />
            </Link>
            <button
              onClick={logout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', border: 'none', background: '#fff', color: 'var(--alert-color)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              <FiLogOut /> Logout
            </button>
          </aside>

          {/* content */}
          <section className="checkout-box">
            {tab === 'profile' && (
              <>
                <h2>My Profile</h2>
                <div style={{ display: 'grid', gap: 14 }}>
                  {[
                    ['Full Name', user.name],
                    ['Phone Number', user.phone],
                    ['Email', user.email || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ borderBottom: '1px solid #f2f2f2', paddingBottom: 12 }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--hints-color)' }}>{label}</span>
                      <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--title-color)', fontWeight: 600 }}>{value}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--hints-color)', marginTop: 16 }}>
                  To update your details, please contact us at +880 1989 454 658 or WhatsApp.
                </p>
              </>
            )}

            {tab === 'orders' && (
              <>
                <h2>My Orders</h2>
                {myOrders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <FiPackage size={48} color="#ccc" />
                    <h3 style={{ margin: '14px 0 6px' }}>No orders yet</h3>
                    <p>Your placed orders will appear here.</p>
                    <Link className="btn-primary" to="/shop">Start shopping</Link>
                  </div>
                ) : (
                  myOrders.map((o) => (
                    <div key={o.id} className="order-item">
                      <div className="order-item-head">
                        <div>
                          <strong style={{ letterSpacing: 1 }}>{o.id}</strong>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--hints-color)' }}>
                            {new Date(o.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                        <span className={`order-status ${o.status}`}>{o.status}</span>
                      </div>
                      <div style={{ margin: '12px 0', borderTop: '1px solid #f2f2f2', paddingTop: 12 }}>
                        {o.items.map((i) => (
                          <div key={`${i.slug}-${i.size}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0', fontSize: 13 }}>
                            <img src={i.image} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                            <span style={{ flex: 1 }}>{i.name}{i.size ? ` · ${i.size}` : ''} × {i.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <strong>Total: {taka(o.total)}</strong>
                        <Link to={`/track/order?id=${o.id}`} className="sec-btn" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
                          <span>Track this order</span>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <style>{`@media (max-width: 991px) { .account-grid { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}
