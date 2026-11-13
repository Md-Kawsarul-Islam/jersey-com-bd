import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  products as bundledProducts,
  categories,
  categoryName,
} from '../data/products';

const ProductsContext = createContext(null);

/**
 * Loads the live catalog from the API (so admin edits — price, stock,
 * enabled — take effect storefront-wide). Falls back to the bundled
 * catalog when the API is unreachable (e.g. static hosting without the
 * Node server). Either way the shop keeps working.
 */
export function ProductsProvider({ children }) {
  const [catalog, setCatalog] = useState(bundledProducts);
  const [apiOnline, setApiOnline] = useState(true);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(2000);

  const fetchCatalog = useCallback(() => {
    return fetch('/api/products')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (Array.isArray(data.products)) setCatalog(data.products);
        if (data.freeDeliveryThreshold) setFreeDeliveryThreshold(data.freeDeliveryThreshold);
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false)); // bundled catalog stays active
  }, []);

  useEffect(() => {
    fetchCatalog();
    // also refresh when the tab regains focus (picks up admin edits made elsewhere)
    const onFocus = () => fetchCatalog();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCatalog]);

  const enabledCatalog = useMemo(
    () => catalog.filter((p) => p.enabled !== false),
    [catalog]
  );

  const getByCategory = useCallback(
    (slug) => enabledCatalog.filter((p) => (p.categories || []).includes(slug)),
    [enabledCatalog]
  );
  const getBySlug = useCallback(
    (slug) => catalog.find((p) => p.slug === slug) || null,
    [catalog]
  );
  const searchProducts = useCallback(
    (q) => {
      const needle = q.trim().toLowerCase();
      if (!needle) return [];
      return enabledCatalog.filter((p) => p.name.toLowerCase().includes(needle));
    },
    [enabledCatalog]
  );

  const value = useMemo(
    () => ({
      products: enabledCatalog,
      catalog,
      getByCategory,
      getBySlug,
      searchProducts,
      categories,
      categoryName,
      apiOnline,
      freeDeliveryThreshold,
      refresh: fetchCatalog,
    }),
    [
      enabledCatalog,
      catalog,
      getByCategory,
      getBySlug,
      searchProducts,
      apiOnline,
      freeDeliveryThreshold,
      fetchCatalog,
    ]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used inside <ProductsProvider>');
  return ctx;
}
