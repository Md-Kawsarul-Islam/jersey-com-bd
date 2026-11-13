import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiX, FiChevronRight, FiUser } from 'react-icons/fi';
import { useUI } from '../context/UIContext';
import { useCart } from '../context/CartContext';

const MENU = [
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

export default function MobileMenu() {
  const { mobileMenuOpen, closeMobileMenu } = useUI();
  const { user } = useCart();
  const [openSub, setOpenSub] = useState(null);
  const navigate = useNavigate();

  const go = (to) => {
    closeMobileMenu();
    navigate(to);
  };

  return (
    <>
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      <aside
        className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="sidebar-menu-head">
          <img src="/assets/avatar.png" alt="Profile" />
          <div className="sidebar-menu-info">
            <span className="name">Hello there!</span>
            {user ? (
              <Link to="/account" onClick={closeMobileMenu} className="action-btn">
                {user.name.split(' ')[0]}’s Account
              </Link>
            ) : (
              <Link to="/login" onClick={closeMobileMenu} className="action-btn">
                Login / Register
              </Link>
            )}
          </div>
          <button
            aria-label="Close menu"
            onClick={closeMobileMenu}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}
          >
            <FiX />
          </button>
        </div>

        <ul className="mm-list">
          {MENU.map((item) =>
            item.children ? (
              <li className={`mm-item ${openSub === item.label ? 'open' : ''}`} key={item.label}>
                <button
                  className="mm-toggle"
                  onClick={() => setOpenSub(openSub === item.label ? null : item.label)}
                  aria-expanded={openSub === item.label}
                  style={{
                    width: '100%', background: 'none', border: 'none', textAlign: 'left',
                    padding: '14px 18px', fontSize: 14, fontWeight: 500, color: 'var(--title-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  }}
                >
                  {item.label}
                  <FiChevronRight className="chev" />
                </button>
                <ul className="mm-sub">
                  {item.children.map((child) => (
                    <li key={child.to}>
                      <Link to={child.to} onClick={closeMobileMenu}>
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li key={item.label}>
                <Link to={item.to} onClick={closeMobileMenu}>
                  {item.label}
                  <FiChevronRight />
                </Link>
              </li>
            )
          )}
        </ul>

        <div className="sidebar-more-menu">
          <p className="more-menu-title">Quick Links</p>
          <ul>
            <li>
              <Link to="/wishlist" onClick={closeMobileMenu}>
                <img src="/assets/icon-wishlist.svg" alt="" /> Wishlists
              </Link>
            </li>
            <li>
              <Link to="/page/about-us" onClick={closeMobileMenu}>
                <img src="/assets/icon-about.svg" alt="" /> About Us
              </Link>
            </li>
            <li>
              <Link to="/track/order" onClick={closeMobileMenu}>
                <FiUser style={{ width: 22, height: 22 }} /> Track Order
              </Link>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
