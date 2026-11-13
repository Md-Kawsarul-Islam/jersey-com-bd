import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Register() {
  const { register } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your name.';
    if (!/^01[3-9]\d{8}$/.test(form.phone.trim())) errs.phone = 'Enter a valid BD phone (01XXXXXXXXX).';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = 'Enter a valid email or leave it blank.';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const result = register(form);
    if (result.ok) navigate('/account');
    else setErrors({ phone: result.error });
  };

  return (
    <main className="container section-padding">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="sub">Join Jersey.com.bd for faster checkout and order tracking.</p>

        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input id="name" className={`form-control ${errors.name ? 'error' : ''}`} placeholder="e.g. Mohammad Rahim" value={form.name} onChange={set('name')} autoComplete="name" />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input id="phone" className={`form-control ${errors.phone ? 'error' : ''}`} placeholder="01XXXXXXXXX" inputMode="numeric" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input id="email" className={`form-control ${errors.email ? 'error' : ''}`} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input id="password" className={`form-control ${errors.password ? 'error' : ''}`} type="password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm Password *</label>
            <input id="confirm" className={`form-control ${errors.confirm ? 'error' : ''}`} type="password" placeholder="Re-enter password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
            {errors.confirm && <p className="field-error">{errors.confirm}</p>}
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', height: 48 }}>Create Account</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Sign in</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--hints-color)', marginTop: 10 }}>
          Demo mode: accounts are stored locally in your browser — no real passwords leave this device.
        </p>
      </div>
    </main>
  );
}
