import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

/** Scrolls to the top on every route change. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
}

/** Global toast notification. */
export function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className="toast-box" role="status" aria-live="polite">
      <FiCheckCircle size={18} />
      <span>{toast}</span>
    </div>
  );
}
