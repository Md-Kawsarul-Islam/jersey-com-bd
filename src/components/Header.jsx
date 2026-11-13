import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FiHeart,
  FiMenu,
  FiChevronDown,
  FiMapPin,
  FiUser,
  FiShoppingCart,
  FiSearch,
  FiList,
} from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { useProducts } from '../context/ProductsContext';
import { taka } from './ProductCard';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  {
    label: 'Football Club Jersey',
    to: '/category/football-club-jersey',
    children: [
      { label: 'Half Sleeve Jersey', to: '/category/half-sleeve-jersey' },
      { label: 'Full Sleeve Jersey', to: '/category/full-sleeve-jersey' },
    ],
  },
  {
    label: 'Football Country Jersey',
    to: '/category/football-country-jersey',
    children: [
      { label: 'Half Sleeve Jersey', to: '/category/half-sleeve-jersey-2' },
      { label: 'Full Sleeve Jersey', to: '/category/full-sleeve-jersey-2' },
    ],
  },
  { label: 'Retro Jerseys', to: '/category/retro-jerseys' },
  { label: 'National Team Jerseys', to: '/category/national-team-jersey' },
  { label: 'Combo', to: '/combos' },
  { label: 'Shorts', to: '/category/shorts' },
];

export default function Header() {
  const { searchProducts } = useProducts();
  const { itemCount, setCartOpen } = useCart();
  const { toggleMobileMenu, toggleSearch } = useUI();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const results = query.trim() ? searchProducts(query).slice(0, 6) : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 140);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowResults(false);
    navigate(`/shop?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="header style-6">
      {/* ===== middle bar ===== */}
      <div className="header-middle">
        <div className="container">
          <div className="header-left">
            <button
              className="mobile-menu-toggle"
              aria-label="Toggle menu"
              onClick={toggleMobileMenu}
            >
              <FiMenu />
            </button>
            <Link to="/" className="logo" aria-label="Jersey.com.bd home">
              <img src="/assets/logo.svg" alt="Jersey.com.bd" width="406" height="73" />
            </Link>
          </div>

          <div className="header-searchbar" ref={searchRef}>
            <form className="header-search" onSubmit={submitSearch} role="search">
              <input
                type="text"
                name="search"
                autoComplete="off"
                aria-label="Search products"
                placeholder="Search in..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
              />
              <button className="btn-search" type="submit" aria-label="Search">
                <FiSearch />
              </button>
            </form>
            {showResults && query.trim() && (
              <ul className="live_search_box">
                {results.length === 0 && (
                  <li className="live_search_item" style={{ padding: '12px', color: '#767a7a' }}>
                    No products found for “{query.trim()}”
                  </li>
                )}
                {results.map((p) => (
                  <li className="live_search_item" key={p.slug}>
                    <Link to={`/product/${p.slug}`} onClick={() => setShowResults(false)}>
                      <img src={p.images[0]} alt={p.name} />
                      <span>
                        <span className="live-search-name">{p.name}</span>
                        <span className="live-search-price">{taka(p.price)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {results.length > 0 && (
                  <li>
                    <Link className="live-search-all" to={`/shop?search=${encodeURIComponent(query.trim())}`} onClick={() => setShowResults(false)}>
                      View all results for “{query.trim()}” →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="header-right">
            <Link className="h-action d-hide-sm" to="/track/order" aria-label="Track Order">
              <FiMapPin />
              <span className="header-action-label">Track Order</span>
            </Link>
            <Link className="h-action d-hide-sm" to="/login" aria-label="Sign In">
              <FiUser />
              <span className="header-action-label">Sign In</span>
            </Link>
            <Link className="h-action d-hide-sm" to="/wishlist" aria-label="Wishlist">
              <FiHeart />
              <span className="header-action-label">Wishlist</span>
            </Link>
            <button className="h-action" onClick={() => setCartOpen(true)} aria-label="Open cart">
              <span className="cart-icon-wrap">
                <FiShoppingCart />
                <span className="cart-count">{itemCount}</span>
              </span>
              <span className="header-action-label d-hide-sm">Cart</span>
            </button>

            <div className="more-menu">
              <button className="h-action" aria-label="More options" aria-haspopup="true">
                <FiList />
                <span className="header-action-label d-hide-sm">More</span>
              </button>
              <ul className="more-submenu">
                <li>
                  <Link to="/wishlist">
                    <img src="/assets/icon-wishlist.svg" alt="" /> Wishlists
                  </Link>
                </li>
                <li>
                  <Link to="/page/about-us">
                    <img src="/assets/icon-about.svg" alt="" /> About Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ===== sticky bottom nav ===== */}
      <div className={`header-bottom sticky-header has-dropdown ${scrolled ? 'fixed' : ''}`}>
        <div className="container">
          <div className="inner-wrap">
            <Link to="/" className="sticky-logo" aria-label="Jersey.com.bd home">
              <img src="/assets/logo.svg" alt="Jersey.com.bd" />
            </Link>

            <nav className="main-nav" aria-label="Main navigation">
              <ul className="menu">
                {NAV_ITEMS.map((item) =>
                  item.children ? (
                    <li className="has-submenu" key={item.label}>
                      <NavLink to={item.to}>
                        {item.label} <FiChevronDown aria-hidden="true" />
                      </NavLink>
                      <ul className="submenu">
                        {item.children.map((child) => (
                          <li key={child.to}>
                            <NavLink to={child.to}>{child.label}</NavLink>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <NavLink to={item.to} end={item.to === '/'}>
                        {item.label}
                      </NavLink>
                    </li>
                  )
                )}
              </ul>
            </nav>

            <div className="sticky-menu-right">
              <button aria-label="Open search" onClick={toggleSearch}>
                <FiSearch />
              </button>
              <Link to="/login" aria-label="Account">
                <FiUser />
              </Link>
              <Link to="/wishlist" aria-label="Wishlist">
                <FiHeart />
              </Link>
              <button aria-label="Open cart" onClick={() => setCartOpen(true)}>
                <FiShoppingCart />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
