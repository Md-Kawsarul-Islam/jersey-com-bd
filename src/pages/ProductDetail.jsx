import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiHeart,
  FiShoppingCart,
  FiZap,
  FiPhone,
  FiCopy,
  FiCheck,
  FiChevronRight,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import ProductCard, { taka } from '../components/ProductCard';

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const SIZE_TABLE = [
  { size: 'S', length: '27"', chest: '36"', tolerance: '±1"' },
  { size: 'M', length: '28"', chest: '38"', tolerance: '±1"' },
  { size: 'L', length: '29"', chest: '40"', tolerance: '±1"' },
  { size: 'XL', length: '30"', chest: '42"', tolerance: '±1"' },
  { size: '2XL', length: '31"', chest: '44"', tolerance: '±1"' },
  { size: '3XL', length: '32"', chest: '46"', tolerance: '±1"' },
];

export default function ProductDetail() {
  const { getBySlug, getByCategory } = useProducts();
  const { slug } = useParams();
  const navigate = useNavigate();
  const product = getBySlug(slug);
  const { addToCart, toggleWishlist, isWishlisted, showToast, setCartOpen } = useCart();

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState('M');
  const [sizeError, setSizeError] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveImage(0);
    setSize('M');
    setQty(1);
    setTab('description');
    setSizeError(false);
    window.scrollTo(0, 0);
  }, [slug]);

  const related = useMemo(() => {
    if (!product) return [];
    const primaryCat = product.categories[0];
    return getByCategory(primaryCat)
      .filter((p) => p.slug !== product.slug)
      .slice(0, 4);
  }, [product]);

  if (!product || product.enabled === false) {
    return (
      <main className="container section-padding">
        <div className="empty-state">
          <h2>{product ? 'Currently unavailable' : 'Product not found'}</h2>
          <p>{product ? 'This product has been temporarily withdrawn by the store.' : 'The product you’re looking for doesn’t exist or was removed.'}</p>
          <Link className="btn-primary" to="/shop">Browse all products</Link>
        </div>
      </main>
    );
  }

  const outOfStock = product.stock === 0;
  const wished = isWishlisted(product.slug);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waText = encodeURIComponent(`I want to order: ${product.name} — ${shareUrl}`);

  const requireSize = () => {
    // sizes always have a default (M); this guard exists for clarity
    if (!size) {
      setSizeError(true);
      showToast('Please select a size');
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!requireSize()) return;
    if (outOfStock) return;
    addToCart(product.slug, { size, qty });
    showToast('Added to cart');
    setCartOpen(true);
  };

  const handleBuyNow = () => {
    if (!requireSize()) return;
    if (outOfStock) return;
    addToCart(product.slug, { size, qty });
    navigate('/checkout');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Link copied to clipboard');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy link');
    }
  };

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li><FiChevronRight size={12} /></li>
            <li><Link to={`/category/${product.categories[0]}`}>{product.categories[0].replace(/-/g, ' ')}</Link></li>
            <li><FiChevronRight size={12} /></li>
            <li aria-current="page" style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding">
        <div className="pd-grid">
          {/* gallery */}
          <div>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-card)' }}>
              <img
                src={product.images[activeImage]}
                alt={product.name}
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
              />
            </div>
            {product.images.length > 1 && (
              <div className="pd-thumbs" role="tablist" aria-label="Product images">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={i === activeImage ? 'active' : ''}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={img} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* buy box */}
          <div>
            <h1 className="pd-title">{product.name}</h1>
            <div className="pd-price-row">
              <span className="pd-price">{taka(product.price)}</span>
              {product.originalPrice && <span className="pd-old">{taka(product.originalPrice)}</span>}
              {product.discount && <span className="pd-save">Save {product.discount}%</span>}
            </div>

            <p style={{ color: 'var(--body-color)', lineHeight: 1.7, margin: '0 0 16px' }}>
              Premium imported fabric, slim athletic fit, high-quality embossed club crest —
              never a cheap sticker. Available in sizes S–3XL. Colors may vary slightly depending on your device.
            </p>
            {typeof product.stock === 'number' && (
              outOfStock ? (
                <p style={{ color: 'var(--alert-color)', fontWeight: 700, margin: '0 0 14px' }}>Out of stock — check back soon</p>
              ) : product.stock <= 10 ? (
                <p style={{ color: '#d97706', fontWeight: 700, margin: '0 0 14px' }}>Hurry! Only {product.stock} left in stock</p>
              ) : (
                <p style={{ color: 'var(--success-color)', fontWeight: 700, margin: '0 0 14px' }}>In stock ({product.stock})</p>
              )
            )}

            <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 700, color: 'var(--title-color)' }}>
              Size: <span style={{ color: 'var(--primary-color)' }}>{size}</span>
            </div>
            <div className="size-list" role="radiogroup" aria-label="Select size">
              {SIZES.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={size === s}
                  className={`size-btn ${size === s ? 'active' : ''}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="size-guide-toggle" onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
              {showGuide ? 'Hide' : 'Show'} Size Guide
            </button>
            {showGuide && (
              <table className="size-table">
                <thead>
                  <tr><th>Size</th><th>Length</th><th>Chest</th><th>Tolerance</th></tr>
                </thead>
                <tbody>
                  {SIZE_TABLE.map((r) => (
                    <tr key={r.size}><td>{r.size}</td><td>{r.length}</td><td>{r.chest}</td><td>{r.tolerance}</td></tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '16px 0', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--title-color)', marginBottom: 6 }}>Quantity:</div>
                <div className="qty-select">
                  <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Quantity"
                  />
                  <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
                </div>
              </div>
              <button
                className={`wishlist-btn ${wished ? 'active' : ''}`}
                style={{ position: 'static', width: 46, height: 46 }}
                aria-label="Toggle wishlist"
                aria-pressed={wished}
                onClick={() => {
                  toggleWishlist(product.slug);
                  showToast(wished ? 'Removed from wishlist' : 'Added to wishlist');
                }}
              >
                <FiHeart size={20} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="pd-actions">
              <button className="btn-primary" onClick={handleAddToCart} disabled={outOfStock} style={{ minWidth: 170, height: 50, opacity: outOfStock ? 0.5 : 1 }}>
                <FiShoppingCart /> {outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button className="btn-primary" onClick={handleBuyNow} disabled={outOfStock} style={{ minWidth: 150, height: 50, background: 'var(--secondary-color)', opacity: outOfStock ? 0.5 : 1 }}>
                <FiZap /> Buy Now
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                className="btn-outline"
                href={`https://wa.me/8801989454658?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderColor: '#25D366', color: '#128C4A' }}
              >
                <FaWhatsapp size={18} /> Order on WhatsApp
              </a>
              <a className="btn-outline" href="tel:+8801989454658">
                <FiPhone /> Call for order
              </a>
            </div>

            <p style={{ fontSize: 12, color: 'var(--hints-color)', marginTop: 14 }}>
              Brand: <strong>Jersey.com.bd</strong> · Cash on Delivery available · Delivery 1–5 days
            </p>

            <div className="share-row">
              <span>Share:</span>
              <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"><FaWhatsapp size={17} /></a>
              <button onClick={copyLink} aria-label="Copy product link">
                {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="pd-tabs" role="tablist">
          {[
            { id: 'description', label: 'Description' },
            { id: 'size-guide', label: 'Size Guide' },
            { id: 'reviews', label: 'Customer Reviews (0)' },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pd-tab-body" role="tabpanel">
          {tab === 'description' && (
            <ul>
              <li>Imported premium quality player-version fabric — breathable and moisture-wicking</li>
              <li>High-quality embossed club crest (not a cheap sticker)</li>
              <li>Slim athletic fit; take one size up if you prefer a regular fit</li>
              <li>Available sizes: S, M, L, XL, 2XL, 3XL</li>
              <li>Care: wash inside-out, cold water, air dry in shade</li>
              <li>Note: colors may vary slightly depending on your screen</li>
            </ul>
          )}
          {tab === 'size-guide' && (
            <table className="size-table" style={{ maxWidth: 560 }}>
              <thead><tr><th>Size</th><th>Length</th><th>Chest</th><th>Tolerance</th></tr></thead>
              <tbody>
                {SIZE_TABLE.map((r) => (
                  <tr key={r.size}><td>{r.size}</td><td>{r.length}</td><td>{r.chest}</td><td>{r.tolerance}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'reviews' && (
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--title-color)' }}>0.0 Average Rating</p>
              <p>(0 Reviews)</p>
              <p style={{ color: 'var(--hints-color)' }}>No reviews yet. Be the first to order and share your feedback on WhatsApp!</p>
            </div>
          )}
        </div>

        {/* related products */}
        {related.length > 0 && (
          <section aria-label="Related products" style={{ marginTop: 30 }}>
            <div className="section-head">
              <h3 className="title">You may also like</h3>
              <Link className="sec-btn" to={`/category/${product.categories[0]}`}><span>View all</span></Link>
            </div>
            <div className="product-grid cols-4">
              {related.map((p) => (
                <ProductCard product={p} key={p.slug} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
