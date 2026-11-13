import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiX,
  FiCheck,
  FiLoader,
  FiUploadCloud,
  FiTrash2,
  FiStar,
  FiAlertCircle,
  FiImage,
  FiPlus,
} from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';
import { useCart } from '../../context/CartContext';
import { taka } from '../../components/ProductCard';

export const PRODUCT_CATEGORIES = [
  { slug: 'football-club-jersey', name: 'Football Club Jersey' },
  { slug: 'half-sleeve-jersey', name: 'Half Sleeve Jersey' },
  { slug: 'full-sleeve-jersey', name: 'Full Sleeve Jersey' },
  { slug: 'football-country-jersey', name: 'Football Country Jersey' },
  { slug: 'half-sleeve-jersey-2', name: 'Half Sleeve Jersey (Country)' },
  { slug: 'full-sleeve-jersey-2', name: 'Full Sleeve Jersey (Country)' },
  { slug: 'retro-jerseys', name: 'Retro Jerseys' },
  { slug: 'national-team-jersey', name: 'National Team Jerseys' },
  { slug: 'shorts', name: 'Shorts' },
];
const SUBCATEGORIES = ['Half Sleeve', 'Full Sleeve', 'Home', 'Away', 'Third Kit', 'Special Edition', 'Retro', 'Fan Edition', 'Player Version', 'Polo', 'Training'];
const emptyForm = {
  name: '', sku: '', category: 'football-club-jersey', subcategory: '',
  price: '', originalPrice: '', stock: 50, description: '',
  enabled: true, featured: false, images: [], variants: [{ name: 'Size', values: 'S, M, L, XL, 2XL, 3XL' }],
};
const initFrom = (p) =>
  p
    ? {
        name: p.name || '', sku: p.sku || '',
        category: (p.categories && p.categories[0]) || 'football-club-jersey',
        subcategory: p.subcategory || '',
        price: String(p.price ?? ''), originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
        stock: p.stock ?? 0, description: p.description || '',
        enabled: p.enabled !== false, featured: !!p.featured,
        images: [...(p.images || [])],
        variants: (p.variants || []).map((v) => ({ name: v.name, values: Array.isArray(v.values) ? v.values.join(', ') : String(v.values || '') })),
      }
    : { ...emptyForm, images: [], variants: [{ name: 'Size', values: 'S, M, L, XL, 2XL, 3XL' }] };

const resizeImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

export default function ProductForm({ initialProduct, onClose, onSaved }) {
  const { adminJson, adminFetch } = useAdmin();
  const { showToast } = useCart();
  const isEditing = !!initialProduct;
  const [form, setForm] = useState(() => initFrom(initialProduct));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const priceNum = Number(form.price) || 0;
  const origNum = form.originalPrice === '' ? null : Number(form.originalPrice);
  const discount = useMemo(() => {
    if (origNum && origNum > priceNum && priceNum > 0) {
      return Math.max(1, Math.round(100 - (priceNum / origNum) * 100));
    }
    return null;
  }, [origNum, priceNum]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const remaining = 8 - form.images.length;
      const usable = files.slice(0, remaining);
      if (usable.length < files.length) showToast(`Only ${remaining} image slot(s) left — extra files skipped.`);
      const dataUrls = await Promise.all(usable.map(resizeImage));
      const res = await adminFetch('/api/admin/uploads', {
        method: 'POST',
        body: JSON.stringify({ images: dataUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((f) => ({ ...f, images: [...f.images, ...data.urls] }));
      setErrors((e2) => ({ ...e2, images: undefined }));
    } catch (err) {
      showToast(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) => setForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }));
  const makePrimary = (url) =>
    setForm((f) => ({ ...f, images: [url, ...f.images.filter((i) => i !== url)] }));

  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { name: '', values: '' }] }));
  const updateVariant = (i, key, value) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, [key]: value } : v)) }));
  const removeVariant = (i) =>
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 4) e.name = 'Name must be at least 4 characters.';
    if (form.sku.trim().length < 2) e.sku = 'SKU must be at least 2 characters.';
    if (!Number.isFinite(priceNum) || priceNum <= 0) e.price = 'Sale price must be greater than 0.';
    if (origNum !== null && (!Number.isFinite(origNum) || origNum < 0)) e.originalPrice = 'Regular price must be valid.';
    if (origNum !== null && origNum > 0 && origNum < priceNum) e.originalPrice = 'Regular price should not be lower than sale price.';
    const stockNum = Number(form.stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) e.stock = 'Stock must be a whole number ≥ 0.';
    if (form.images.length === 0) e.images = 'Add at least one product image.';
    if (!form.category) e.category = 'Choose a category.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      subcategory: form.subcategory.trim(),
      description: form.description.trim(),
      price: priceNum,
      originalPrice: origNum,
      stock: Number(form.stock),
      enabled: form.enabled,
      featured: form.featured,
      images: form.images,
      variants: form.variants
        .map((v) => ({
          name: v.name.trim() || 'Variant',
          values: v.values.split(',').map((s) => s.trim()).filter(Boolean),
        }))
        .filter((v) => v.values.length > 0),
    };
    try {
      const data = isEditing
        ? await adminJson(`/api/admin/products/${initialProduct.slug}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminJson('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
      showToast(isEditing ? 'Product updated' : `Product created: ${data.product.slug}`);
      onSaved(data.product);
    } catch (err) {
      showToast(err.message || 'Could not save the product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? 'Edit product' : 'Add product'}>
      <div className="admin-modal order-form product-form">
        {/* header */}
        <div className="order-form-head">
          <div className="order-form-head-main">
            <FiImage size={18} color="#fff" />
            <div>
              <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
              <p>{isEditing ? initialProduct.slug : 'Add a new jersey to the catalog'}</p>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button>
        </div>

        {/* body */}
        <div className="order-form-body product-form-body">
          {/* LEFT — images + description */}
          <section className="order-form-items">
            <div className="order-form-section-head">
              <h3>Images <span className="order-form-count">{form.images.length}/8</span></h3>
            </div>
            {errors.images && (
              <p className="field-error" role="alert" style={{ margin: '0 0 10px' }}>
                <FiAlertCircle size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />{errors.images}
              </p>
            )}

            {/* gallery */}
            <div className="product-gallery">
              {form.images.map((url, i) => (
                <div className="product-gallery-cell" key={url}>
                  <img src={url} alt={`Product ${i + 1}`} />
                  {i === 0 && <span className="product-gallery-primary">COVER</span>}
                  <div className="product-gallery-actions">
                    {i !== 0 && (
                      <button type="button" className="product-gallery-btn" onClick={() => makePrimary(url)} title="Make cover image" aria-label="Make cover">
                        <FiStar size={13} />
                      </button>
                    )}
                    <button type="button" className="product-gallery-btn danger" onClick={() => removeImage(url)} title="Remove image" aria-label="Remove image">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {form.images.length < 8 && (
                <button type="button" className="product-gallery-cell product-gallery-add" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Upload images">
                  {uploading ? <FiLoader className="spin" size={22} /> : <FiUploadCloud size={24} />}
                  <span>{uploading ? 'Uploading…' : 'Upload'}</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={onPickFiles} />
            <p className="order-status-hint">First image is the cover. Images are resized to max 1400px on upload.</p>

            <div className="order-form-section-head" style={{ marginTop: 18 }}><h3>Description</h3></div>
            <textarea
              className="form-control"
              style={{ height: 130, paddingTop: 12, resize: 'vertical' }}
              placeholder="Premium fabric, slim fit, embossed club crest…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />

            {/* variants */}
            <div className="order-form-section-head" style={{ marginTop: 18 }}>
              <h3>Variants</h3>
              <button type="button" className="admin-btn-ghost" style={{ fontSize: 11.5, padding: '6px 10px' }} onClick={addVariant}>
                <FiPlus size={12} /> Add variant
              </button>
            </div>
            <div className="product-variants">
              {form.variants.map((v, i) => (
                <div className="product-variant-row" key={i}>
                  <input className="admin-cell-input" placeholder="Variant (e.g. Size)" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} aria-label="Variant name" />
                  <input className="admin-cell-input" placeholder="Values, comma separated (S, M, L)" value={v.values} onChange={(e) => updateVariant(i, 'values', e.target.value)} aria-label="Variant values" style={{ flex: 2 }} />
                  <button type="button" className="order-line-remove" onClick={() => removeVariant(i)} aria-label="Remove variant"><FiTrash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT — details */}
          <section className="order-form-side">
            <div className="order-form-section-head"><h3>Product details</h3></div>

            <div className="form-group">
              <label htmlFor="pf-name">Product name *</label>
              <input id="pf-name" className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Real Madrid Home Premium Jersey 2026-27" />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="pf-sku">SKU *</label>
                <input id="pf-sku" className={`admin-cell-input ${errors.sku ? 'admin-input-danger' : ''}`} value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="RM-HOME-2627" style={{ textTransform: 'uppercase' }} />
                {errors.sku && <p className="field-error">{errors.sku}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="pf-stock">Stock *</label>
                <input id="pf-stock" className={`admin-cell-input ${errors.stock ? 'admin-input-danger' : ''}`} type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
                {errors.stock && <p className="field-error">{errors.stock}</p>}
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="pf-category">Category *</label>
                <select id="pf-category" className="form-control" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
                {errors.category && <p className="field-error">{errors.category}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="pf-subcategory">Subcategory</label>
                <input id="pf-subcategory" className="admin-cell-input" list="subcategory-list" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Half Sleeve" />
                <datalist id="subcategory-list">
                  {SUBCATEGORIES.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            {/* pricing */}
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="pf-price">Sale price (৳) *</label>
                <input id="pf-price" className={`admin-cell-input ${errors.price ? 'admin-input-danger' : ''}`} type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="990" style={{ fontWeight: 700 }} />
                {errors.price && <p className="field-error">{errors.price}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="pf-original">Regular price (৳)</label>
                <input id="pf-original" className={`admin-cell-input ${errors.originalPrice ? 'admin-input-danger' : ''}`} type="number" min="0" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} placeholder="1250" />
                {errors.originalPrice && <p className="field-error">{errors.originalPrice}</p>}
              </div>
            </div>
            <div className="product-price-preview">
              <div className="product-price-preview-main">
                <span className="product-price-big">{taka(priceNum || 0)}</span>
                {origNum > priceNum && priceNum > 0 && <span className="product-price-was">{taka(origNum)}</span>}
                {discount && <span className="product-price-save">SAVE {discount}%</span>}
              </div>
              <p className="order-status-hint" style={{ marginBottom: 0 }}>
                Storefront shows the sale price{discount ? ` with a −${discount}% badge` : ''}.
              </p>
            </div>

            {/* toggles */}
            <div className="product-toggle-row">
              <div className="product-toggle-cell">
                <div>
                  <span className="product-toggle-label">Active</span>
                  <span className="product-toggle-sub">{form.enabled ? 'Visible on the store' : 'Hidden from the store'}</span>
                </div>
                <button type="button" className={`admin-toggle ${form.enabled ? 'on' : ''}`} onClick={() => set('enabled', !form.enabled)} aria-pressed={form.enabled} aria-label="Toggle product active"><span /></button>
              </div>
              <div className="product-toggle-cell">
                <div>
                  <span className="product-toggle-label"><FiStar size={12} style={{ verticalAlign: '-1px' }} /> Featured</span>
                  <span className="product-toggle-sub">{form.featured ? 'Shows in Featured first' : 'Not featured'}</span>
                </div>
                <button type="button" className={`admin-toggle ${form.featured ? 'on' : ''}`} onClick={() => set('featured', !form.featured)} aria-pressed={form.featured} aria-label="Toggle featured product"><span /></button>
              </div>
            </div>
          </section>
        </div>

        {/* footer */}
        <div className="order-form-foot">
          <div className="order-form-foot-total">
            <span>Price</span>
            <strong>{taka(priceNum || 0)}</strong>
          </div>
          <div className="order-form-foot-actions">
            <button className="admin-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="admin-btn-primary" onClick={save} disabled={saving || uploading}>
              {saving ? <FiLoader className="spin" size={15} /> : <FiCheck size={15} />}
              {isEditing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
