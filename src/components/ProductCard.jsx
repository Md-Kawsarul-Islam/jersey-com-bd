import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiZap, FiStar } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

const taka = (n) => '৳' + Number(n).toLocaleString('en-IN');

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted, showToast, setCartOpen } = useCart();
  const navigate = useNavigate();
  const wished = isWishlisted(product.slug);

  const handleAddToCart = () => {
    if (product.stock === 0) return;
    addToCart(product.slug, { qty: 1 });
    showToast('Added to cart');
    setCartOpen(true);
  };

  const handleBuyNow = () => {
    if (product.stock === 0) return;
    addToCart(product.slug, { qty: 1 });
    navigate('/checkout');
  };

  return (
    <div className="product style-7">
      <div className="product-cover">
        <Link to={`/product/${product.slug}`} className="p-image" aria-label={product.name}>
          <img src={product.images[0]} alt={product.name} loading="lazy" />
          {product.images[1] && (
            <img className="hover-img" src={product.images[1]} alt="" loading="lazy" aria-hidden="true" />
          )}
        </Link>
        {product.discount && product.stock !== 0 && <span className="discount">Save {product.discount}%</span>}
        {product.stock === 0 && <span className="discount" style={{ background: 'var(--hints-color)' }}>Out of stock</span>}
        {product.featured && <span className="featured-badge"><FiStar size={11} fill="currentColor" /> FEATURED</span>}
        <button
          className={`wishlist-btn ${wished ? 'active' : ''}`}
          aria-label="Toggle wishlist"
          aria-pressed={wished}
          onClick={() => {
            toggleWishlist(product.slug);
            showToast(wished ? 'Removed from wishlist' : 'Added to wishlist');
          }}
        >
          <FiHeart fill={wished ? 'currentColor' : 'none'} size={17} />
        </button>
      </div>

      <div className="product-info">
        <Link to={`/product/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-pricing">
          <span className="current-price">{taka(product.price)}</span>
          {product.originalPrice && (
            <span className="original-price">{taka(product.originalPrice)}</span>
          )}
        </div>
        {typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5 && (
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: '#d97706' }}>
            Only {product.stock} left!
          </p>
        )}
        <div className="product-actions">
          <button
            type="button"
            className="product-btn theme-btn buyNow-btn"
            title="Buy Now"
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            style={product.stock === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <FiZap size={13} /> Buy Now
          </button>
          <button
            type="button"
            className="product-btn theme-btn"
            title="Add to cart"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            style={product.stock === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <FiShoppingCart size={13} /> Order Now
          </button>
        </div>
      </div>
    </div>
  );
}

export { taka };
