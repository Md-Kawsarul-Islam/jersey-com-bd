import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiX,
  FiMinus,
  FiPlus,
  FiTrash2,
  FiSearch,
  FiLoader,
  FiShoppingBag,
  FiCheck,
  FiAlertCircle,
  FiMessageCircle,
  FiChevronRight,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useAdmin } from '../../context/AdminContext';
import { useCart } from '../../context/CartContext';
import { taka } from '../../components/ProductCard';
import { ORDER_STATUSES, STATUS_LABEL } from './orderStatuses';

const FREE_DELIVERY_THRESHOLD = 2000;
const DELIVERY_FEE = { inside: 60, outside: 120 };

const emptyCustomer = { name: '', phone: '', address: '' };

/**
 * Order create/edit form used by the admin Orders page.
 * - items: full line editing (qty, price, name, size) with stock-aware catalog picker
 * - live client-side totals (server recomputes authoritatively on save)
 * - validation + error toasts, delete flow with inline confirm for existing orders
 */
export default function OrderForm({ initialOrder, onClose, onSaved, onDeleted }) {
  const { adminJson } = useAdmin();
  const { showToast, freeDeliveryThreshold } = useCart();
  const isEditing = !!initialOrder;
  const threshold = freeDeliveryThreshold || FREE_DELIVERY_THRESHOLD;

  const [customer, setCustomer] = useState(() => ({ ...emptyCustomer, ...(initialOrder?.customer || {}) }));
  const [zone, setZone] = useState(initialOrder?.zone || 'inside');
  const [payment, setPayment] = useState(initialOrder?.payment || 'cod');
  const [note, setNote] = useState(initialOrder?.note || '');
  const [status, setStatus] = useState(initialOrder?.status || 'pending');
  const [delivery, setDelivery] = useState(initialOrder?.deliveryOverride ? String(initialOrder.delivery) : '');
  const [items, setItems] = useState(() =>
    (initialOrder?.items || []).map((i) => ({ ...i }))
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // product picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState({ name: '', price: '', qty: 1 });
  const pickerSearchRef = useRef(null);

  /* ---------- live totals (mirrors server recalc) ---------- */
  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let totalQty = 0;
    for (const item of items) {
      const qty = Math.max(1, Number(item.qty) || 1);
      const price = Math.max(0, Number(item.price) || 0);
      subtotal += price * qty;
      const orig = item.originalPrice ?? price;
      if (orig > price) discount += (orig - price) * qty;
      totalQty += qty;
    }
    const autoDelivery = subtotal >= threshold ? 0 : DELIVERY_FEE[zone] ?? 60;
    const deliveryValue =
      delivery === '' || delivery === null ? autoDelivery : Math.max(0, Number(delivery) || 0);
    return { subtotal, discount, delivery: deliveryValue, total: subtotal + deliveryValue, totalQty };
  }, [items, zone, delivery, threshold]);

  /* ---------- product search (debounced) ---------- */
  useEffect(() => {
    if (!pickerOpen || customMode) return;
    setPickerLoading(true);
    const t = window.setTimeout(() => {
      const q = productQuery.trim();
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      adminJson(`/api/admin/products${params}`)
        .then((data) => setProductResults((data.products || []).slice(0, 12)))
        .catch(() => setProductResults([]))
        .finally(() => setPickerLoading(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [productQuery, pickerOpen, customMode, adminJson]);

  useEffect(() => {
    if (pickerOpen && pickerSearchRef.current) pickerSearchRef.current.focus();
  }, [pickerOpen]);

  // lock body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const setField = (key) => (e) => {
    setCustomer((c) => ({ ...c, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const updateLine = (lineId, key, value) => {
    setItems((prev) => prev.map((i) => (i.lineId === lineId ? { ...i, [key]: value } : i)));
  };
  const changeQty = (lineId, delta) => {
    setItems((prev) =>
      prev.map((i) =>
        i.lineId === lineId ? { ...i, qty: Math.max(1, Math.min(999, (Number(i.qty) || 1) + delta)) } : i
      )
    );
  };
  const removeLine = (lineId) => setItems((prev) => prev.filter((i) => i.lineId !== lineId));

  const addFromCatalog = (product) => {
    setItems((prev) => [
      ...prev,
      {
        lineId: 'tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        slug: product.slug,
        name: product.name,
        image: product.images?.[0] || '',
        size: null,
        qty: 1,
        price: product.price,
        originalPrice: product.originalPrice ?? null,
        _stock: product.stock,
      },
    ]);
    setPickerOpen(false);
    setProductQuery('');
  };

  const addCustom = () => {
    const name = customDraft.name.trim();
    const price = Number(customDraft.price);
    const qty = Math.max(1, Math.floor(Number(customDraft.qty) || 1));
    if (!name) {
      setErrors((p) => ({ ...p, custom: 'Enter the item name.' }));
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setErrors((p) => ({ ...p, custom: 'Enter a valid price (৳0 or more).' }));
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        lineId: 'tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        slug: null,
        name,
        image: '',
        size: null,
        qty,
        price: Math.round(price),
        originalPrice: null,
      },
    ]);
    setCustomDraft({ name: '', price: '', qty: 1 });
    setCustomMode(false);
    setPickerOpen(false);
    setErrors((p) => ({ ...p, custom: undefined }));
  };

  /* ---------- validation + save ---------- */
  const validate = () => {
    const errs = {};
    if (customer.name.trim().length < 2) errs.name = 'Please enter the customer name.';
    if (!/^01[3-9]\d{8}$/.test(customer.phone.trim())) errs.phone = 'Enter a valid BD phone (01XXXXXXXXX).';
    if (customer.address.trim().length < 10) errs.address = 'Please enter the full delivery address (min 10 characters).';
    if (items.length === 0) errs.items = 'Add at least one product to the order.';
    for (const item of items) {
      if (!String(item.name).trim()) {
        errs.items = 'Every line needs a product name.';
        break;
      }
      if (!(Number(item.qty) >= 1)) {
        errs.items = 'Every line needs a quantity of at least 1.';
        break;
      }
      if (!(Number(item.price) >= 0)) {
        errs.items = 'Every line needs a valid price.';
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      },
      zone,
      payment,
      note: note.trim(),
      status,
      ...(delivery !== '' ? { delivery: Number(delivery) } : {}),
      items: items.map((i) => ({
        lineId: i.lineId.startsWith('tmp-') ? undefined : i.lineId,
        slug: i.slug,
        name: i.name,
        size: i.size || null,
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        price: Math.max(0, Math.round(Number(i.price) || 0)),
        originalPrice: i.originalPrice ?? undefined,
      })),
    };
    try {
      const data = isEditing
        ? await adminJson(`/api/admin/orders/${initialOrder.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminJson('/api/admin/orders', { method: 'POST', body: JSON.stringify(payload) });
      showToast(isEditing ? `Order ${data.order.id} updated` : `Order ${data.order.id} created`);
      onSaved(data.order);
    } catch (e) {
      showToast(e.message || 'Could not save the order');
    } finally {
      setSaving(false);
    }
  };

  const removeOrder = async () => {
    setDeleting(true);
    try {
      await adminJson(`/api/admin/orders/${initialOrder.id}`, { method: 'DELETE' });
      showToast(`Order ${initialOrder.id} deleted`);
      onDeleted(initialOrder.id);
    } catch (e) {
      showToast(e.message || 'Could not delete the order');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const cancelled = status === 'cancelled';

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? 'Edit order' : 'Create order'}>
      <div className="admin-modal order-form">
        {/* ===== modal header ===== */}
        <div className="order-form-head">
          <div className="order-form-head-main">
            <FiShoppingBag size={18} color="#fff" />
            <div>
              <h2>{isEditing ? `Edit Order` : 'New Order'}</h2>
              <p>{isEditing ? initialOrder.id : 'Create a manual customer order'}</p>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        {/* ===== body ===== */}
        <div className="order-form-body">
          {/* ===== LEFT — items ===== */}
          <section className="order-form-items">
            <div className="order-form-section-head">
              <h3>Products <span className="order-form-count">{totals.totalQty}</span></h3>
              {cancelled && <span className="order-form-cancelled-tag">CANCELLED — read only</span>}
            </div>

            {errors.items && (
              <p className="field-error" role="alert" style={{ margin: '0 0 10px' }}>
                <FiAlertCircle size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />{errors.items}
              </p>
            )}

            {/* item rows */}
            <div className="order-lines">
              {items.length === 0 && (
                <div className="order-lines-empty">
                  <FiShoppingBag size={30} strokeWidth={1.3} color="#c9c9c9" />
                  <p>No products yet. Add from the catalog or a custom item.</p>
                </div>
              )}
              {items.map((item) => (
                <div className="order-line" key={item.lineId}>
                  {item.image ? (
                    <img className="order-line-img" src={item.image} alt="" />
                  ) : (
                    <div className="order-line-img order-line-img-custom">1×</div>
                  )}
                  <div className="order-line-main">
                    <input
                      className="order-line-name"
                      value={item.name}
                      onChange={(e) => updateLine(item.lineId, 'name', e.target.value)}
                      aria-label="Product name"
                      disabled={cancelled}
                    />
                    <div className="order-line-meta">
                      {item.slug ? <span className="order-line-slug">{item.slug}</span> : <span className="order-line-custom-tag">CUSTOM ITEM</span>}
                      {item.size ? <span> · Size: {item.size}</span> : null}
                      {typeof item._stock === 'number' && <span> · {item._stock} in stock</span>}
                    </div>
                    <div className="order-line-controls">
                      <div className="qty-stepper" aria-label="Quantity">
                        <button type="button" onClick={() => changeQty(item.lineId, -1)} disabled={cancelled || (Number(item.qty) || 1) <= 1} aria-label="Decrease quantity"><FiMinus size={13} /></button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateLine(item.lineId, 'qty', e.target.value.replace(/[^0-9]/g, ''))}
                          aria-label="Quantity"
                          disabled={cancelled}
                        />
                        <button type="button" onClick={() => changeQty(item.lineId, 1)} disabled={cancelled} aria-label="Increase quantity"><FiPlus size={13} /></button>
                      </div>
                      <div className="order-line-price">
                        <span>৳</span>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateLine(item.lineId, 'price', e.target.value)}
                          aria-label="Unit price"
                          disabled={cancelled}
                        />
                      </div>
                      <span className="order-line-total">{taka((Number(item.price) || 0) * (Number(item.qty) || 1))}</span>
                      <button className="order-line-remove" onClick={() => removeLine(item.lineId)} disabled={cancelled} aria-label="Remove item" title="Remove item">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* add product */}
            {!cancelled && (
              <div className="order-add">
                {!pickerOpen && (
                  <button className="order-add-btn" onClick={() => setPickerOpen(true)}>
                    <FiPlus size={15} /> Add product to this order
                  </button>
                )}
                {pickerOpen && (
                  <div className="order-picker">
                    <div className="order-picker-tabs">
                      <button className={`order-picker-tab ${!customMode ? 'active' : ''}`} onClick={() => setCustomMode(false)}>From catalog</button>
                      <button className={`order-picker-tab ${customMode ? 'active' : ''}`} onClick={() => setCustomMode(true)}>Custom item</button>
                      <button className="order-picker-close" onClick={() => setPickerOpen(false)} aria-label="Close picker"><FiX size={15} /></button>
                    </div>

                    {!customMode && (
                      <>
                        <div className="order-picker-search">
                          <FiSearch size={15} />
                          <input ref={pickerSearchRef} placeholder="Search club / country / product name…" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} aria-label="Search products" />
                          {pickerLoading && <FiLoader className="spin" size={15} />}
                        </div>
                        <div className="order-picker-results">
                          {productResults.length === 0 && !pickerLoading && (
                            <p className="order-picker-empty">No products match “{productQuery.trim()}”.</p>
                          )}
                          {productResults.map((p) => (
                            <button key={p.slug} className="order-picker-item" onClick={() => addFromCatalog(p)}>
                              <img src={p.images?.[0]} alt="" loading="lazy" />
                              <span className="order-picker-item-name">{p.name}</span>
                              <span className="order-picker-item-meta">
                                <strong>{taka(p.price)}</strong>
                                <span className={`order-picker-stock ${p.stock === 0 ? 'oos' : ''}`}>
                                  {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                                </span>
                              </span>
                              <FiChevronRight size={15} />
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {customMode && (
                      <div className="order-custom">
                        {errors.custom && <p className="field-error" style={{ margin: '0 0 8px' }}>{errors.custom}</p>}
                        <input
                          className="form-control"
                          placeholder="Item name (e.g. Name & number printing)"
                          value={customDraft.name}
                          onChange={(e) => setCustomDraft((d) => ({ ...d, name: e.target.value }))}
                          aria-label="Custom item name"
                        />
                        <div className="order-custom-row">
                          <div className="order-line-price" style={{ flex: 1 }}>
                            <span>৳</span>
                            <input type="number" min="0" placeholder="Price" value={customDraft.price} onChange={(e) => setCustomDraft((d) => ({ ...d, price: e.target.value }))} aria-label="Custom item price" />
                          </div>
                          <div className="qty-stepper">
                            <button type="button" onClick={() => setCustomDraft((d) => ({ ...d, qty: Math.max(1, d.qty - 1) }))} aria-label="Decrease custom quantity"><FiMinus size={13} /></button>
                            <input type="number" min="1" value={customDraft.qty} onChange={(e) => setCustomDraft((d) => ({ ...d, qty: Math.max(1, Number(e.target.value) || 1) }))} aria-label="Custom item quantity" />
                            <button type="button" onClick={() => setCustomDraft((d) => ({ ...d, qty: d.qty + 1 }))} aria-label="Increase custom quantity"><FiPlus size={13} /></button>
                          </div>
                        </div>
                        <button className="admin-btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={addCustom}>
                          <FiPlus size={14} /> Add item
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* totals */}
            <div className="order-totals">
              <div className="order-totals-row"><span>Subtotal</span><span>{taka(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="order-totals-row green"><span>Discount</span><span>− {taka(totals.discount)}</span></div>}
              <div className="order-totals-row">
                <span>Delivery <span className="order-totals-note">{delivery === '' ? 'auto' : 'manual'}</span></span>
                <span>{totals.delivery === 0 ? 'FREE' : taka(totals.delivery)}</span>
              </div>
              <div className="order-totals-grand"><span>TOTAL</span><span>{taka(totals.total)}</span></div>
            </div>
          </section>

          {/* ===== RIGHT — customer / meta ===== */}
          <section className="order-form-side">
            <div className="order-form-section-head"><h3>Order details</h3></div>

            <div className="form-group">
              <label htmlFor="of-name">Customer name *</label>
              <input id="of-name" className={`form-control ${errors.name ? 'error' : ''}`} value={customer.name} onChange={setField('name')} placeholder="e.g. Mohammad Rahim" />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="of-phone">Phone *</label>
              <input id="of-phone" className={`form-control ${errors.phone ? 'error' : ''}`} value={customer.phone} onChange={setField('phone')} inputMode="numeric" placeholder="01XXXXXXXXX" />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="of-address">Delivery address *</label>
              <textarea id="of-address" className={`form-control ${errors.address ? 'error' : ''}`} style={{ height: 80, paddingTop: 10, resize: 'vertical' }} value={customer.address} onChange={setField('address')} placeholder="House, road, area, thana, district" />
              {errors.address && <p className="field-error">{errors.address}</p>}
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="of-zone">Delivery zone</label>
                <select id="of-zone" className="form-control" value={zone} onChange={(e) => setZone(e.target.value)}>
                  <option value="inside">Inside Dhaka — ৳60</option>
                  <option value="outside">Outside Dhaka — ৳120</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="of-payment">Payment</label>
                <select id="of-payment" className="form-control" value={payment} onChange={(e) => setPayment(e.target.value)}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="bkash">bKash (Manual)</option>
                  <option value="nagad">Nagad (Manual)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="of-delivery">Delivery charge <span className="order-totals-note">blank = auto</span></label>
              <input id="of-delivery" className="form-control" type="number" min="0" placeholder={`Auto: ${taka(totals.delivery)}`} value={delivery} onChange={(e) => setDelivery(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
            <div className="form-group">
              <label htmlFor="of-note">Order note</label>
              <textarea id="of-note" className="form-control" style={{ height: 60, paddingTop: 10, resize: 'vertical' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="TrxID for bKash/Nagad, printing instructions…" />
            </div>

            <div className="form-group">
              <label htmlFor="of-status">Order status</label>
              <select id="of-status" className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <p className="order-status-hint">
                {status === 'cancelled'
                  ? 'Restores all items to stock.'
                  : 'Moving to Cancelled returns this order’s products to inventory.'}
              </p>
            </div>

            {isEditing && (
              <a className="admin-btn-ghost" style={{ textDecoration: 'none', marginBottom: 4 }} href={`https://wa.me/${customer.phone.replace(/^0/, '880')}?text=${encodeURIComponent(`Hello ${customer.name}, this is Jersey.com.bd about order ${initialOrder.id}.`)}`} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp size={15} color="#25D366" /> Chat with customer on WhatsApp
              </a>
            )}

            {/* delete (edit mode) */}
            {isEditing && !confirmDelete && (
              <button className="admin-danger-btn" onClick={() => setConfirmDelete(true)}>
                <FiTrash2 size={14} /> Delete this order
              </button>
            )}
            {isEditing && confirmDelete && (
              <div className="order-confirm-delete">
                <p><FiAlertCircle size={15} /> Delete <strong>{initialOrder.id}</strong> permanently? Its products return to stock.</p>
                <div className="order-confirm-actions">
                  <button className="admin-btn-ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Keep order</button>
                  <button className="admin-btn-danger" onClick={removeOrder} disabled={deleting}>
                    {deleting ? <FiLoader className="spin" size={14} /> : <FiTrash2 size={14} />} Delete
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ===== footer ===== */}
        <div className="order-form-foot">
          <div className="order-form-foot-total">
            <span>Total</span>
            <strong>{taka(totals.total)}</strong>
          </div>
          <div className="order-form-foot-actions">
            <button className="admin-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="admin-btn-primary" onClick={save} disabled={saving}>
              {saving ? <FiLoader className="spin" size={15} /> : <FiCheck size={15} />}
              {isEditing ? 'Save changes' : 'Create order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
