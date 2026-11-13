import { useState } from 'react';
import { FiMapPin, FiPhone, FiMail, FiSend, FiClock } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

export default function Contact() {
  const { showToast } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your name.';
    if (!/^01[3-9]\d{8}$/.test(form.phone.trim())) errs.phone = 'Enter a valid BD phone (01XXXXXXXXX).';
    if (form.message.trim().length < 10) errs.message = 'Message must be at least 10 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    const payload = { ...form, message: form.message.trim() };
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ message: data.error || 'Could not send your message. Please try again.' });
        setSending(false);
        return;
      }
      setSending(false);
      setForm({ name: '', phone: '', subject: '', message: '' });
      showToast('Message received! We will call you soon. 📞');
    } catch {
      // server offline — store the message locally
      const saved = JSON.parse(localStorage.getItem('jbd_messages') || '[]');
      localStorage.setItem('jbd_messages', JSON.stringify([...saved, { ...payload, createdAt: Date.now() }]));
      setSending(false);
      setForm({ name: '', phone: '', subject: '', message: '' });
      showToast('Message saved on this device (server offline). We will reach you ASAP.');
    }
  };

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">Contact Us</h1>
          <ul className="breadcrumb">
            <li><a href="/">Home</a></li>
            <li>/</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding">
        <div className="checkout-grid">
          <div className="checkout-box">
            <h2>Send us a message</h2>
            <form onSubmit={submit} noValidate>
              <div className="form-group">
                <label htmlFor="cname">Name *</label>
                <input id="cname" className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={set('name')} placeholder="Your name" />
                {errors.name && <p className="field-error">{errors.name}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="cphone">Phone *</label>
                <input id="cphone" className={`form-control ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="numeric" />
                {errors.phone && <p className="field-error">{errors.phone}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="csubject">Subject</label>
                <input id="csubject" className="form-control" value={form.subject} onChange={set('subject')} placeholder="Order issue, size exchange, bulk order…" />
              </div>
              <div className="form-group">
                <label htmlFor="cmsg">Message *</label>
                <textarea id="cmsg" className={`form-control ${errors.message ? 'error' : ''}`} style={{ height: 110, paddingTop: 12, resize: 'vertical' }} value={form.message} onChange={set('message')} placeholder="How can we help you today?" />
                {errors.message && <p className="field-error">{errors.message}</p>}
              </div>
              <button type="submit" className="btn-primary" disabled={sending} style={{ width: '100%', height: 48 }}>
                <FiSend /> {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </div>

          <aside className="checkout-box">
            <h2>Reach us directly</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 18 }}>
              <li style={{ display: 'flex', gap: 12 }}>
                <FiMapPin size={22} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Chashara, Narayanganj Sadar-1400,<br />Narayanganj, Bangladesh</span>
              </li>
              <li style={{ display: 'flex', gap: 12 }}>
                <FiPhone size={22} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 2 }} />
                <a href="tel:+8801989454658" style={{ color: 'inherit', fontWeight: 600 }}>+880 1989 454 658</a>
              </li>
              <li style={{ display: 'flex', gap: 12 }}>
                <FiMail size={22} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 2 }} />
                <a href="mailto:support@jersey.com.bd" style={{ color: 'inherit', fontWeight: 600 }}>support@jersey.com.bd</a>
              </li>
              <li style={{ display: 'flex', gap: 12 }}>
                <FiClock size={22} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Sat–Thu: 10:00 AM – 9:00 PM<br />Friday: 2:30 PM – 9:00 PM</span>
              </li>
            </ul>
            <a
              className="btn-primary"
              href="https://wa.me/8801989454658?text=Hello%20Jersey.com.bd%2C%20I%20need%20help%20with%20my%20order."
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 22, width: '100%', background: '#25D366', height: 48 }}
            >
              Chat on WhatsApp — fastest response
            </a>
            <p style={{ fontSize: 12, color: 'var(--hints-color)', marginTop: 12 }}>
              Average response time: under 15 minutes during business hours.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
