import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';

export default function NotFound() {
  return (
    <main className="container section-padding">
      <div className="empty-state" style={{ paddingTop: 40 }}>
        <p style={{ fontSize: 96, fontWeight: 800, margin: 0, color: 'var(--primary-color)', lineHeight: 1 }}>404</p>
        <h2>Page not found</h2>
        <p>The page you’re looking for doesn’t exist or has been moved.</p>
        <Link className="btn-primary" to="/"><FiHome /> Back to Home</Link>
      </div>
    </main>
  );
}
