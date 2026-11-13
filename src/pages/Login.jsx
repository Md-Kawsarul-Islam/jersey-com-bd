import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiPhone } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

export default function Login() {
  const { login, user } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  if (user) {
    return (
      <main className="container section-padding">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <FiUser size={48} color="var(--primary-color)" />
          <h1>Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="sub">You’re signed in as {user.phone}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn-primary" to="/account">My Account</Link>
            <Link className="btn-outline" to="/shop">Continue shopping</Link>
          </div>
        </div>
      </main>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const result = login(form.phone, form.password);
    if (result.ok) navigate('/account');
    else setError(result.error);
  };

  return (
    <main className="container section-padding">
      <div className="auth-card">
        <h1>Sign In</h1>
        <p className="sub">Welcome back! Sign in to track orders and checkout faster.</p>

        {error && <p className="field-error" role="alert" style={{ marginBottom: 12, fontSize: 13 }}>{error}</p>}

        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label htmlFor="phone"><FiPhone size={12} /> Phone Number</label>
            <input
              id="phone" className="form-control" placeholder="01XXXXXXXXX" inputMode="numeric"
              autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password"><FiLock size={12} /> Password</label>
            <input
              id="password" className="form-control" type={show ? 'text' : 'password'} placeholder="Your password"
              autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
            />
            <button type="button" onClick={() => setShow((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 0 0' }}>
              {show ? 'Hide' : 'Show'} password
            </button>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', height: 48 }}>Sign In</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
          New here?{' '}
          <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>
            Create an account
          </Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--hints-color)', marginTop: 10 }}>
          Demo mode: accounts are stored locally in your browser — no real passwords leave this device.
        </p>
      </div>
    </main>
  );
}
