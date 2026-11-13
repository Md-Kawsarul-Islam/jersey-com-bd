import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import ProductCard from '../components/ProductCard';

export default function Wishlist() {
  const { getBySlug } = useProducts();
  const { wishlist } = useCart();
  const items = wishlist.map(getBySlug).filter(Boolean);

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">My Wishlist</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>Wishlist</li>
          </ul>
        </div>
      </div>
      <div className="container section-padding">
        {items.length === 0 ? (
          <div className="empty-state">
            <FiHeart size={72} color="#ed1b34" strokeWidth={1.2} />
            <h2>Your wishlist is empty</h2>
            <p>Tap the ♥ on any product to save it here for later.</p>
            <Link className="btn-primary" to="/shop">Browse products</Link>
          </div>
        ) : (
          <>
            <p className="shop-count" style={{ marginBottom: 16 }}>{items.length} saved item{items.length === 1 ? '' : 's'}</p>
            <div className="product-grid cols-4">
              {items.map((p) => (
                <ProductCard product={p} key={p.slug} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
