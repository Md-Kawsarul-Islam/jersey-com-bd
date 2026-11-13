import { NavLink, useNavigate, Navigate, Outlet, Link } from 'react-router-dom';
import {
  FiGrid,
  FiShoppingBag,
  FiPackage,
  FiMail,
  FiUsers,
  FiLogOut,
  FiExternalLink,
  FiHome,
} from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLayout() {
  const { isAdmin, logout } = useAdmin();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const nav = [
    { to: '/admin', label: 'Dashboard', icon: <FiGrid size={17} />, end: true },
    { to: '/admin/orders', label: 'Orders', icon: <FiShoppingBag size={17} /> },
    { to: '/admin/products', label: 'Products', icon: <FiPackage size={17} /> },
    { to: '/admin/messages', label: 'Messages', icon: <FiMail size={17} /> },
    { to: '/admin/subscribers', label: 'Newsletter', icon: <FiUsers size={17} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      {/* ===== sidebar ===== */}
      <aside className="admin-sidebar">
        <Link to="/" className="admin-logo" title="Go to storefront">
          <img src="/assets/logo.svg" alt="Jersey.com.bd" />
          <span>Admin</span>
        </Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <Link to="/" className="admin-nav-link">
            <FiExternalLink size={17} />
            <span>View store</span>
          </Link>
          <button className="admin-nav-link admin-logout" onClick={handleLogout}>
            <FiLogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ===== content ===== */}
      <div className="admin-content">
        <header className="admin-topbar">
          <span className="admin-topbar-title">Jersey.com.bd — Administration</span>
          <Link to="/" className="admin-topbar-store"><FiHome size={14} /> Storefront</Link>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
