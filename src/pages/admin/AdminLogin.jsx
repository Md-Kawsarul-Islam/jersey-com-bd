import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiHome, FiEye, FiEyeOff, FiLoader } from 'react-icons/fi';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLogin() {
  const { login, isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await login(password);
    setBusy(false);
    if (result.ok) navigate('/admin', { replace: true });
    else setError(result.error);
  };

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <img src="/assets/logo.svg" alt="Jersey.com.bd" style={{ height: 40 }} />
        <h1>Admin Panel</h1>
        <p className="admin-login-sub">Sign in to manage orders, products, messages and subscribers.</p>

        {error && <p className="field-error" role="alert" style={{ fontSize: 13 }}>{error}</p>}

        <label htmlFor="admin-password" className="admin-label">
          <FiLock size={13} /> Admin password
        </label>
        <div className="admin-password-wrap">
          <input
            id="admin-password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Enter admin password"
            autoFocus
            autoComplete="current-password"
            className="admin-input"
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="admin-eye">
            {show ? <FiEyeOff size={17} /> : <FiEye size={17} />}
          </button>
        </div>

        <button type="submit" className="admin-btn-primary" disabled={busy} style={{ width: '100%', height: 48 }}>
          {busy ? <FiLoader className="spin" /> : <FiLock />} {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <Link to="/" className="admin-back-link"><FiHome size={13} /> Back to the store</Link>
        <p className="admin-default-note">
          Development default password: <code>admin123</code> — set <code>ADMIN_PASSWORD</code> in production.
        </p>
      </form>
    </main>
  );
}
