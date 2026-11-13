import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useProducts } from './ProductsContext';

const CartContext = createContext(null);

const DELIVERY_INSIDE_DHAKA = 60;
const DELIVERY_OUTSIDE_DHAKA = 120;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }) {
  const { getBySlug, freeDeliveryThreshold: apiThreshold } = useProducts();
  const [items, setItems] = useState(() => readJSON('jbd_cart', []));
  const [wishlist, setWishlist] = useState(() => readJSON('jbd_wishlist', []));
  const [orders, setOrders] = useState(() => readJSON('jbd_orders', []));
  const [user, setUser] = useState(() => readJSON('jbd_user', null));
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const FREE_DELIVERY_THRESHOLD = apiThreshold || Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 2000);

  useEffect(() => {
    localStorage.setItem('jbd_cart', JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem('jbd_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);
  useEffect(() => {
    localStorage.setItem('jbd_orders', JSON.stringify(orders));
  }, [orders]);
  useEffect(() => {
    if (user) localStorage.setItem('jbd_user', JSON.stringify(user));
    else localStorage.removeItem('jbd_user');
  }, [user]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.__jbd_toast_t);
    window.__jbd_toast_t = window.setTimeout(() => setToast(null), 3200);
  }, []);

  /** Cart line item identity includes size so the same product in two sizes is two lines. */
  const lineKey = (slug, size) => `${slug}__${size || 'nosize'}`;

  const addToCart = useCallback(
    (slug, { size = null, qty = 1 } = {}) => {
      const product = getBySlug(slug);
      if (!product) return false;
      if (product.enabled === false) return false;
      setItems((prev) => {
        const key = lineKey(slug, size);
        const existing = prev.find((i) => lineKey(i.slug, i.size) === key);
        if (existing) {
          return prev.map((i) =>
            lineKey(i.slug, i.size) === key ? { ...i, qty: i.qty + qty } : i
          );
        }
        return [
          ...prev,
          { slug, size, qty, price: product.price, addedAt: Date.now() },
        ];
      });
      return true;
    },
    [getBySlug]
  );

  const removeFromCart = useCallback((slug, size) => {
    const key = lineKey(slug, size);
    setItems((prev) => prev.filter((i) => lineKey(i.slug, i.size) !== key));
  }, []);

  const setQty = useCallback((slug, size, qty) => {
    const key = lineKey(slug, size);
    setItems((prev) =>
      prev
        .map((i) =>
          lineKey(i.slug, i.size) === key ? { ...i, qty: Math.max(1, qty) } : i
        )
        .filter((i) => i.qty > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const toggleWishlist = useCallback((slug) => {
    setWishlist((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  const isWishlisted = useCallback((slug) => wishlist.includes(slug), [wishlist]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );
  const originalSubtotal = useMemo(
    () =>
      items.reduce((sum, i) => {
        const p = getBySlug(i.slug);
        return sum + (p?.originalPrice || i.price) * i.qty;
      }, 0),
    [items, getBySlug]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const deliveryFor = useCallback(
    (zone) => (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zone === 'inside' ? DELIVERY_INSIDE_DHAKA : DELIVERY_OUTSIDE_DHAKA),
    [subtotal]
  );

  /* ---------- demo auth (stored locally — no backend) ---------- */
  const login = useCallback((phone, password) => {
    const accounts = readJSON('jbd_accounts', []);
    const match = accounts.find(
      (a) => a.phone === phone.trim() && a.password === btoa(password)
    );
    if (match) {
      setUser({ name: match.name, phone: match.phone, email: match.email || '' });
      return { ok: true };
    }
    return { ok: false, error: 'Invalid phone number or password.' };
  }, []);

  const register = useCallback(({ name, phone, email, password }) => {
    const accounts = readJSON('jbd_accounts', []);
    if (accounts.some((a) => a.phone === phone.trim())) {
      return { ok: false, error: 'An account with this phone number already exists.' };
    }
    const account = {
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      password: btoa(password),
      createdAt: Date.now(),
    };
    localStorage.setItem('jbd_accounts', JSON.stringify([...accounts, account]));
    setUser({ name: account.name, phone: account.phone, email: account.email });
    return { ok: true };
  }, []);

  const logout = useCallback(() => setUser(null), []);

  /* ---------- orders (API-first, localStorage fallback when offline) ---------- */

  const trackOrders = useCallback(
    async (q) => {
      const query = String(q || '').trim().toLowerCase();
      if (!query) return [];
      try {
        const res = await fetch(`/api/orders/track?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          return data.orders || [];
        }
      } catch {
        /* server unreachable — fall through to local fallback */
      }
      return orders.filter(
        (o) =>
          o.id.toLowerCase() === query ||
          o.customer.phone === query.replace(/\s/g, '')
      );
    },
    [orders]
  );

  const placeOrder = useCallback(
    async ({ customer, zone, payment, note }) => {
      // drop catalog items that no longer exist before talking to the server
      const stale = items.filter((i) => !getBySlug(i.slug));
      if (stale.length > 0) {
        setItems((prev) => prev.filter((i) => getBySlug(i.slug)));
        return {
          ok: false,
          error: 'Some jerseys in your cart are no longer available and were removed. Please review your cart and try again.',
        };
      }
      const payload = {
        items: items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })),
        customer,
        zone,
        payment,
        note,
      };
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error || 'Could not place the order. Please try again.' };
        }
        setItems([]);
        return { ok: true, order: data.order };
      } catch {
        /* ----- offline fallback: save the order on this device ----- */
        const delivery = deliveryFor(zone);
        const order = {
          id:
            'JBD' +
            Date.now().toString().slice(-8) +
            Math.floor(Math.random() * 90 + 10),
          items: items.map((i) => {
            const p = getBySlug(i.slug);
            return {
              slug: i.slug,
              name: p?.name || i.slug,
              image: p?.images?.[0] || '',
              size: i.size,
              qty: i.qty,
              price: i.price,
            };
          }),
          subtotal,
          delivery,
          total: subtotal + delivery,
          customer,
          zone,
          payment,
          note: note || '',
          status: 'processing',
          createdAt: Date.now(),
          offline: true,
        };
        setOrders((prev) => [order, ...prev]);
        setItems([]);
        return { ok: true, order, offline: true };
      }
    },
    [items, subtotal, deliveryFor, getBySlug]
  );

  const value = {
    items,
    wishlist,
    orders,
    user,
    cartOpen,
    setCartOpen,
    toast,
    showToast,
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    toggleWishlist,
    isWishlisted,
    subtotal,
    originalSubtotal,
    itemCount,
    freeDelivery,
    amountToFreeDelivery,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    deliveryFor,
    login,
    register,
    logout,
    placeOrder,
    trackOrders,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
