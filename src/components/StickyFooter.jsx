import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingCart, FiSearch, FiUser } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

export default function StickyFooter() {
  const { itemCount, setCartOpen } = useCart();
  const { toggleMobileMenu, toggleSearch } = useUI();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="sticky-footer style-1" aria-label="Mobile quick actions">
      <Link to="/" className={`sticky-link ${isActive('/') ? 'active' : ''}`}>
        <FiHome />
        <p>Home</p>
      </Link>
      <button className="sticky-link" onClick={toggleMobileMenu} aria-label="Open menu">
        <FiGrid />
        <p>Menu</p>
      </button>
      <button className="sticky-link" onClick={() => setCartOpen(true)} aria-label="Open cart">
        <FiShoppingCart />
        {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
        <p>Cart</p>
      </button>
      <button className="sticky-link" onClick={toggleSearch} aria-label="Open search">
        <FiSearch />
        <p>Search</p>
      </button>
      <button
        className="sticky-link"
        onClick={() => navigate('/account')}
        aria-label="Account"
      >
        <FiUser />
        <p>Account</p>
      </button>
    </nav>
  );
}
