import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiStar } from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../context/ProductsContext';

const SORTS = [
  { value: 'default', label: 'Default Sorting' },
  { value: 'featured', label: 'Featured First' },
  { value: 'latest', label: 'Sort by Latest' },
  { value: 'oldest', label: 'Sort by Oldest' },
  { value: 'price-asc', label: 'Price Low to High' },
  { value: 'price-desc', label: 'Price High to Low' },
  { value: 'offered', label: 'Offered Products' },
];

export default function Shop() {
  const { products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const [sort, setSort] = useState('default');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = products.filter((p) =>
      (search ? p.name.toLowerCase().includes(search) : true) &&
      (!featuredOnly || p.featured)
    );
    switch (sort) {
      case 'price-asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case 'offered':
        list = list.filter((p) => p.discount).sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case 'latest':
        list = [...list].reverse();
        break;
      case 'featured':
        list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      default:
        list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }
    return list;
  }, [products, search, sort, featuredOnly]);

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">{search ? `Search: “${searchParams.get('search')}”` : 'Shop All Jerseys'}</h1>
          <ul className="breadcrumb">
            <li><a href="/">Home</a></li>
            <li>/</li>
            <li aria-current="page">{search ? 'Search results' : 'Shop'}</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding">
        <div className="shop-toolbar">
          <span className="shop-count">{filtered.length} product{filtered.length === 1 ? '' : 's'} found</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <FiSearch color="#767a7a" />
            <input
              className="sort-select"
              style={{ width: 220 }}
              placeholder="Filter by name…"
              value={searchParams.get('search') || ''}
              onChange={(e) => {
                const v = e.target.value;
                setSearchParams(v.trim() ? { search: v } : {}, { replace: true });
              }}
              aria-label="Filter products"
            />
            <button
              className={`admin-filter-chip ${featuredOnly ? 'active' : ''}`}
              onClick={() => setFeaturedOnly((v) => !v)}
              aria-pressed={featuredOnly}
              title="Show featured products only"
              style={{ height: 40 }}
            >
              <FiStar size={13} fill={featuredOnly ? 'currentColor' : 'none'} /> Featured
            </button>
            <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <h2>No products found</h2>
            <p>We couldn’t find anything matching “{searchParams.get('search')}”. Try another club or country name.</p>
          </div>
        ) : (
          <div className="product-grid cols-4">
            {filtered.map((p) => (
              <ProductCard product={p} key={p.slug} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
