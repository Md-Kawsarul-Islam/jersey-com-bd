import { useCallback, useEffect, useState } from 'react';
import {
  FiSearch,
  FiLoader,
  FiRefreshCw,
  FiAlertTriangle,
  FiPackage,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';
import { useCart } from '../../context/CartContext';
import { taka } from '../../components/ProductCard';
import { PRODUCT_CATEGORIES } from './ProductForm';
import ProductForm from './ProductForm';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A → Z' },
  { value: 'price-asc', label: 'Price: low → high' },
  { value: 'price-desc', label: 'Price: high → low' },
  { value: 'stock-asc', label: 'Stock: low → high' },
  { value: 'stock-desc', label: 'Stock: high → low' },
];
const LIMIT = 12;

const categoryName = (slug) =>
  PRODUCT_CATEGORIES.find((c) => c.slug === slug)?.name || slug || '—';

export default function AdminProducts() {
  const { adminJson } = useAdmin();
  const { showToast } = useCart();
  const [data, setData] = useState({ products: [], total: 0, page: 1, pages: 1, limit: LIMIT });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formProduct, setFormProduct] = useState(undefined); // undefined = closed | null = new | product = edit
  const [confirmDelete, setConfirmDelete] = useState(null); // product pending deletion
  const [deleting, setDeleting] = useState(false);
  const [quickSaving, setQuickSaving] = useState(null); // slug being quick-toggled

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      search: search.trim(),
      category,
      status,
      sort,
      page: String(page),
      limit: String(LIMIT),
    });
    adminJson(`/api/admin/products?${params.toString()}`)
      .then((d) => {
        setData(d);
        setError('');
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [adminJson, search, category, status, sort, page]);

  useEffect(() => {
    const t = window.setTimeout(load, search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, status, sort]);

  const handleSaved = useCallback(() => {
    setFormProduct(undefined);
    load();
  }, [load]);

  const removeProduct = async (product) => {
    setDeleting(true);
    try {
      const result = await adminJson(`/api/admin/products/${product.slug}`, { method: 'DELETE' });
      showToast(
        result.referencingOrders > 0
          ? `Product deleted — ${result.referencingOrders} existing order(s) kept intact`
          : 'Product deleted'
      );
      setConfirmDelete(null);
      setDeleting(false);
      load();
    } catch (e) {
      showToast(e.message || 'Could not delete the product');
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const quickToggle = async (product, field, value) => {
    setQuickSaving(product.slug);
    try {
      await adminJson(`/api/admin/products/${product.slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      });
      setData((d) => ({
        ...d,
        products: d.products.map((p) => (p.slug === product.slug ? { ...p, [field]: value } : p)),
      }));
    } catch (e) {
      showToast(e.message || 'Could not update the product');
    } finally {
      setQuickSaving(null);
    }
  };

  const showing = {
    from: data.total === 0 ? 0 : (data.page - 1) * LIMIT + 1,
    to: Math.min(data.page * LIMIT, data.total),
  };

  // compact page number buttons (window of 5)
  const pageButtons = (() => {
    const pages = data.pages;
    let start = Math.max(1, Math.min(data.page - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  })();

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Products</h1>
          <p className="admin-sub">{data.total} products — add, edit, hide, delete. Storefront updates live.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="admin-btn-ghost" onClick={load} aria-label="Refresh products">
            <FiRefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="admin-btn-primary" onClick={() => setFormProduct(null)}>
            <FiPlus size={15} /> Add New Product
          </button>
        </div>
      </div>

      {/* toolbar */}
      <div className="admin-filter-row">
        <div className="admin-search-box" style={{ maxWidth: 340 }}>
          <FiSearch size={15} />
          <input
            placeholder="Search name, SKU, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <select className="admin-status-select" style={{ minWidth: 185 }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {PRODUCT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="admin-status-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <select className="admin-status-select" style={{ minWidth: 160 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {error && <div className="admin-error-box"><FiAlertTriangle size={15} /> {error} — is the API server running?</div>}

      {/* table */}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table admin-products-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Image</th>
                <th>Product</th>
                <th>Category</th>
                <th style={{ width: 96 }}>Price</th>
                <th style={{ width: 76 }}>Stock</th>
                <th style={{ width: 84 }}>Featured</th>
                <th style={{ width: 84 }}>Visible</th>
                <th style={{ width: 108 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 34 }}><FiLoader className="spin" size={22} /></td></tr>
              )}
              {!loading && data.products.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 44 }}>
                    <FiPackage size={38} color="#d4d4d4" strokeWidth={1.2} />
                    <p style={{ color: 'var(--hints-color)', marginTop: 10 }}>No products match{search ? ` “${search}”` : ''}.</p>
                  </td>
                </tr>
              )}
              {!loading && data.products.map((p) => (
                <tr key={p.slug} className={p.enabled === false ? 'admin-row-disabled' : ''}>
                  <td>
                    <img src={p.images?.[0]} alt="" style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} loading="lazy" />
                  </td>
                  <td>
                    <span className="admin-strong" style={{ fontSize: 12.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</span>
                    <span className="admin-muted" style={{ fontSize: 10.5, fontFamily: 'Consolas, monospace' }}>{p.sku}</span>
                  </td>
                  <td className="admin-muted" style={{ fontSize: 11.5 }}>{categoryName((p.categories || [])[0])}</td>
                  <td className="admin-strong">
                    {taka(p.price)}
                    {p.originalPrice > p.price && <><br /><span style={{ fontSize: 10.5, color: '#999', fontWeight: 500, textDecoration: 'line-through' }}>{taka(p.originalPrice)}</span></>}
                  </td>
                  <td>
                    <span className={`admin-stock-pill ${p.stock === 0 ? 'oos' : p.stock <= 5 ? 'low' : ''}`}>{p.stock}</span>
                  </td>
                  <td>
                    <button
                      className={`admin-star-btn ${p.featured ? 'active' : ''}`}
                      onClick={() => quickToggle(p, 'featured', !p.featured)}
                      disabled={quickSaving === p.slug}
                      aria-pressed={p.featured}
                      aria-label={p.featured ? 'Remove from featured' : 'Mark as featured'}
                      title={p.featured ? 'Featured — click to unfeature' : 'Mark as featured'}
                    >
                      <FiStar size={17} fill={p.featured ? '#f8b400' : 'none'} stroke={p.featured ? '#f8b400' : '#c9c9c9'} />
                    </button>
                  </td>
                  <td>
                    <button
                      className={`admin-toggle ${p.enabled !== false ? 'on' : ''}`}
                      onClick={() => quickToggle(p, 'enabled', p.enabled === false)}
                      disabled={quickSaving === p.slug}
                      aria-pressed={p.enabled !== false}
                      aria-label={p.enabled !== false ? 'Visible — click to hide' : 'Hidden — click to show'}
                      title={p.enabled !== false ? 'Visible — click to hide' : 'Hidden — click to show'}
                    >
                      <span />
                    </button>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" onClick={() => setFormProduct(p)} aria-label={`Edit ${p.name}`} title="Edit product">
                        <FiEdit3 size={15} />
                      </button>
                      <button className="admin-icon-btn danger" onClick={() => setConfirmDelete(p)} aria-label={`Delete ${p.name}`} title="Delete product">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination bar */}
        <div className="admin-pagination">
          <span className="admin-muted" style={{ fontSize: 12 }}>
            Showing <strong>{showing.from}–{showing.to}</strong> of <strong>{data.total}</strong>
          </span>
          <div className="admin-pagination-controls">
            <button className="admin-page-btn" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={data.page <= 1} aria-label="Previous page"><FiChevronLeft /></button>
            {pageButtons.map((n) => (
              <button key={n} className={`admin-page-btn ${n === data.page ? 'active' : ''}`} onClick={() => setPage(n)} aria-label={`Page ${n}`} aria-current={n === data.page ? 'page' : undefined}>{n}</button>
            ))}
            <button className="admin-page-btn" onClick={() => setPage((v) => Math.min(data.pages, v + 1))} disabled={data.page >= data.pages} aria-label="Next page"><FiChevronRight /></button>
          </div>
        </div>
      </div>

      <p className="admin-footnote">
        Products are shared live with the storefront — price, stock, images and visibility take effect on the next page load. Deleting a product keeps existing orders intact (they store their own snapshot).
      </p>

      {/* add/edit modal */}
      {formProduct !== undefined && (
        <ProductForm initialProduct={formProduct} onClose={() => setFormProduct(undefined)} onSaved={handleSaved} />
      )}

      {/* delete confirmation */}
      {confirmDelete && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="Delete product">
          <div className="admin-confirm-card">
            <FiAlertTriangle size={40} color="#b45309" strokeWidth={1.4} />
            <h3>Delete “{confirmDelete.name.slice(0, 70)}{confirmDelete.name.length > 70 ? '…' : ''}”?</h3>
            <p>
              The product will disappear from the storefront immediately. Existing orders keep their item snapshots and are <strong>not</strong> affected.
            </p>
            <p className="order-status-hint" style={{ margin: '10px 0 0' }}>SKU: {confirmDelete.sku} · Slug: {confirmDelete.slug}</p>
            <div className="order-confirm-actions" style={{ marginTop: 16 }}>
              <button className="admin-btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Keep product</button>
              <button className="admin-btn-danger" onClick={() => removeProduct(confirmDelete)} disabled={deleting}>
                {deleting ? <FiLoader className="spin" size={14} /> : <FiTrash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
