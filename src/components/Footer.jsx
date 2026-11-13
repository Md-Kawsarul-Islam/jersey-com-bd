import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiFacebook,
  FiInstagram,
  FiYoutube,
  FiSend,
} from 'react-icons/fi';
import { FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { footerCompanyLinks, footerAccountLinks } from '../data/content';
import { useCart } from '../context/CartContext';

export default function Footer() {
  const { showToast } = useCart();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const subscribe = async (e) => {
    e.preventDefault();
    const value = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    if (!valid) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError('You are already subscribed!');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Subscribe failed');
      setEmail('');
      setError('');
      showToast('Thanks for subscribing! 🎉');
    } catch (err) {
      // offline fallback — store locally
      const saved = JSON.parse(localStorage.getItem('jbd_newsletter') || '[]');
      if (saved.includes(value)) {
        setError('You are already subscribed!');
        return;
      }
      localStorage.setItem('jbd_newsletter', JSON.stringify([...saved, value]));
      setEmail('');
      setError('');
      showToast(err.message === 'Failed to fetch' ? 'Saved on this device (server offline)' : (err.message || 'Thanks for subscribing!'));
    }
  };

  return (
    <footer className="footer style-3">
      <div className="container">
        <div className="footer-top">
          <div className="footer-grid">
            {/* about */}
            <div className="footer-widget footer-about footer-about-col">
              <Link to="/" className="footer-logo" aria-label="Jersey.com.bd home">
                <img src="/assets/logo.svg" alt="Jersey.com.bd" />
              </Link>
              <p className="f-about-text">
                Bangladesh’s #1 Online Store for Authentic Football, Cricket, and Custom Jerseys.
              </p>
              <ul className="footer-contact">
                <li>
                  <FiMapPin aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>Chashara, Narayanganj Sadar-1400, Narayanganj, Bangladesh</span>
                </li>
                <li>
                  <a href="tel:+8801989454658">
                    <FiPhone aria-hidden="true" /> +880 1989 454 658
                  </a>
                </li>
                <li>
                  <a href="mailto:support@jersey.com.bd">
                    <FiMail aria-hidden="true" /> support@jersey.com.bd
                  </a>
                </li>
              </ul>
              <ul className="footer-social">
                <li><a href="https://www.facebook.com/jersey.com.bdstore" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FiFacebook size={18} /></a></li>
                <li><a href="https://www.instagram.com/jersey.com.bdstore" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FiInstagram size={18} /></a></li>
                <li><a href="https://www.youtube.com/@Jersey.com.bd_official/shorts" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><FiYoutube size={18} /></a></li>
                <li><a href="https://www.tiktok.com/@jersey.com_bd" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><FaTiktok size={17} /></a></li>
                <li><a href="https://wa.me/8801989454658" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp size={19} /></a></li>
              </ul>
            </div>

            {/* company links */}
            <nav className="footer-widget quick-links" aria-label="Company">
              <p className="footer-widget-title">COMPANY</p>
              <ul className="footer-widget-list">
                {footerCompanyLinks.map((l) => (
                  <li key={l.label}><Link to={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </nav>

            {/* account links */}
            <nav className="footer-widget accounts" aria-label="Accounts">
              <p className="footer-widget-title">ACCOUNTS</p>
              <ul className="footer-widget-list">
                {footerAccountLinks.map((l) => (
                  <li key={l.label}><Link to={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </nav>

            {/* showroom */}
            <div className="footer-widget pages">
              <p className="footer-widget-title">Showroom Location</p>
              <ul className="footer-widget-list">
                <li style={{ fontSize: 14, color: 'var(--body-color)', lineHeight: 1.7 }}>
                  Chashara, Narayanganj Sadar-1400,<br />Narayanganj, Bangladesh
                </li>
                <li>
                  <a
                    href="https://www.google.com/maps/search/Chashara+Narayanganj+Bangladesh"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary-color)', fontWeight: 600 }}
                  >
                    Open in Google Maps →
                  </a>
                </li>
                <li style={{ fontSize: 12, color: 'var(--hints-color)' }}>
                  Sat–Thu: 10AM–9PM<br />Friday: 2:30PM–9PM
                </li>
              </ul>
            </div>

            {/* newsletter */}
            <div className="footer-widget newsletter footer-newsletter-col">
              <p className="footer-widget-title">Sign Up Newsletter</p>
              <p className="f-widget-text">Don’t worry, we won’t spam you!</p>
              <form className="footer-newsletter" onSubmit={subscribe} noValidate>
                <input
                  type="email"
                  name="email"
                  placeholder="Type Your E-mail"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  aria-label="Email for newsletter"
                  required
                />
                <button type="submit" aria-label="Subscribe">
                  <FiSend size={18} color="#fff" />
                </button>
              </form>
              {error && <p className="field-error" role="alert">{error}</p>}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-widget">
            <p className="f-copyight-text">
              Copyright © 2026 Jersey.com.bd All rights reserved
              <span className="getcommerce-copyright">
                Developed by{' '}
                <a href="https://getcommerce.xyz" target="_blank" rel="noopener noreferrer">
                  Getcommerce
                </a>
              </span>
            </p>
            <div className="footer-payment-img">
              <img src="/assets/payment.png" alt="Accepted payment methods — bKash, Nagad, Cash on Delivery" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
