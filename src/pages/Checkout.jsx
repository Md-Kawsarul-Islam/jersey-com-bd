import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiShoppingBag, FiTruck } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import { taka } from '../components/ProductCard';

const PAYMENTS = [
  { id: 'cod', label: 'Cash on Delivery', note: 'Pay when you receive the parcel. Available nationwide.' },
  { id: 'bkash', label: 'bKash (Manual)', note: 'Send the total to 01989454658 (Personal). Enter your Transaction ID below.' },
  { id: 'nagad', label: 'Nagad (Manual)', note: 'Send the total to 01989454658 (Personal). Enter your Transaction ID below.' },
];

export default function Checkout() {
  const { getBySlug } = useProducts();
  const {
    items, subtotal, placeOrder, deliveryFor, freeDelivery, user,
  } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    zone: 'inside',
    note: '',
    payment: 'cod',
    transactionId: '',
  });
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);

  const delivery = deliveryFor(form.zone);
  const total = subtotal + delivery;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!/^01[3-9]\d{8}$/.test(form.phone.trim())) e.phone = 'Enter a valid BD phone (e.g. 01XXXXXXXXX).';
    if (!form.address.trim() || form.address.trim().length < 10) e.address = 'Please enter your full address (min 10 characters).';
    if (form.payment !== 'cod' && form.transactionId.trim().length < 6) {
      e.transactionId = 'Enter your bKash/Nagad Transaction ID (min 6 characters).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!validate()) return;
    setPlacing(true);
    const result = await placeOrder({
      customer: { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() },
      zone: form.zone,
      payment: form.payment,
      note: form.payment === 'cod' ? form.note.trim() : `${form.note.trim()} | TrxID: ${form.transactionId.trim()}`.trim(),
    });
    setPlacing(false);
    if (!result.ok) {
      setErrors({ submit: result.error });
      return;
    }
    navigate(`/order-success/${result.order.id}`, { state: { order: result.order, offline: result.offline } });
  };

  if (items.length === 0) {
    return (
      <main className="container section-padding">
        <div className="empty-state">
          <FiShoppingBag size={72} color="#ccc" strokeWidth={1.2} />
          <h2>Your cart is empty</h2>
          <p>Add some jerseys first, then come back to checkout.</p>
          <Link className="btn-primary" to="/shop">Browse all jerseys</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">Checkout</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>Checkout</li>
          </ul>
        </div>
      </div>

      <form className="container section-padding" onSubmit={submit} noValidate>
        <div className="checkout-grid">
          {/* ===== form column ===== */}
          <div className="checkout-box">
            <h2>Delivery Information</h2>

            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input id="name" className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={set('name')} placeholder="e.g. Mohammad Rahim" autoComplete="name" />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input id="phone" className={`form-control ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="numeric" autoComplete="tel" />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="address">Full Address *</label>
              <textarea
                id="address"
                className={`form-control ${errors.address ? 'error' : ''}`}
                style={{ height: 84, paddingTop: 12, resize: 'vertical' }}
                value={form.address}
                onChange={set('address')}
                placeholder="House, road, area, thana, district"
              />
              {errors.address && <p className="field-error">{errors.address}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="zone">Delivery Zone *</label>
              <select id="zone" className="form-control" value={form.zone} onChange={set('zone')}>
                <option value="inside">Inside Dhaka — ৳60 (1–3 days)</option>
                <option value="outside">Outside Dhaka — ৳120 (3–5 days)</option>
              </select>
              {freeDelivery && (
                <p className="compliance-note" style={{ color: 'var(--success-color)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                  ✓ FREE delivery applied (order above ৳2,000)
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="note">Order Note (optional)</label>
              <input id="note" className="form-control" value={form.note} onChange={set('note')} placeholder="e.g. Name & number to print: RAHIM 10" />
            </div>

            <h2 style={{ marginTop: 22 }}>Payment Method</h2>
            <div className="payment-methods" role="radiogroup" aria-label="Payment method">
              {PAYMENTS.map((p) => (
                <label key={p.id} className={`payment-method ${form.payment === p.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value={p.id}
                    checked={form.payment === p.id}
                    onChange={set('payment')}
                  />
                  <span>
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--title-color)' }}>{p.label}</strong>
                    <span style={{ fontSize: 12, color: 'var(--hints-color)' }}>{p.note}</span>
                  </span>
                </label>
              ))}
            </div>

            {form.payment !== 'cod' && (
              <div className="form-group" style={{ marginTop: 14 }}>
                <label htmlFor="trx">Transaction ID (TrxID) *</label>
                <input
                  id="trx"
                  className={`form-control ${errors.transactionId ? 'error' : ''}`}
                  value={form.transactionId}
                  onChange={set('transactionId')}
                  placeholder="e.g. 8N7X6K5M2A"
                  autoComplete="off"
                />
                {errors.transactionId && <p className="field-error">{errors.transactionId}</p>}
              </div>
            )}
          </div>

          {/* ===== summary column ===== */}
          <aside className="checkout-box" aria-label="Order summary">
            <h2><FiShoppingBag style={{ verticalAlign: '-3px', marginRight: 8 }} />Order Summary</h2>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {items.map((item) => {
                const p = getBySlug(item.slug);
                if (!p) return null;
                return (
                  <div key={`${item.slug}-${item.size}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f2f2f2' }}>
                    <img src={p.images[0]} alt={p.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--title-color)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--hints-color)' }}>{item.size ? `Size: ${item.size} · ` : ''}Qty: {item.qty}</p>
                    </div>
                    <strong style={{ fontSize: 13 }}>{taka(item.price * item.qty)}</strong>
                  </div>
                );
              })}
            </div>

            <div className="cart-totals-row" style={{ marginTop: 14 }}>
              <span>Subtotal</span>
              <span>{taka(subtotal)}</span>
            </div>
            <div className="cart-totals-row">
              <span><FiTruck style={{ verticalAlign: '-3px', marginRight: 4 }} />Delivery</span>
              <span>{delivery === 0 ? 'FREE' : taka(delivery)}</span>
            </div>
            <div className="cart-totals-row grand">
              <span>Total</span>
              <span>{taka(total)}</span>
            </div>

            {errors.submit && (
              <p className="field-error" role="alert" style={{ marginTop: 10, fontSize: 13 }}>
                {errors.submit}
              </p>
            )}
            <button type="submit" className="btn-checkout" disabled={placing} style={{ marginTop: 12 }}>
              <FiLock /> {placing ? 'Placing order…' : `Place Order — ${taka(total)}`}
            </button>
            <p className="payment-note">
              <FiLock size={11} style={{ verticalAlign: '-1px' }} /> Your information is used only to deliver this order.
              We never sell your data.
            </p>
          </aside>
        </div>
      </form>
    </main>
  );
}
