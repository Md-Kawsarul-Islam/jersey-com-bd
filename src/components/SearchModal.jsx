import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiX, FiSearch } from 'react-icons/fi';
import { useUI } from '../context/UIContext';
import { useProducts } from '../context/ProductsContext';
import { taka } from './ProductCard';

export default function SearchModal() {
  const { searchProducts } = useProducts();
  const { searchOpen, closeSearch } = useUI();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const results = query.trim() ? searchProducts(query).slice(0, 8) : [];

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!searchOpen) setQuery('');
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    closeSearch();
    navigate(`/shop?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className={`search-modal ${searchOpen ? 'open' : ''}`} role="dialog" aria-label="Search products">
      <div className="search-modal-head">
        <strong>Search Products</strong>
        <button className="search-close" onClick={closeSearch} aria-label="Close search">
          <FiX />
        </button>
      </div>
      <form onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search in..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" aria-label="Search">
          <FiSearch />
        </button>
      </form>
      {results.length > 0 && (
        <div className="search-modal-results">
          {results.map((p) => (
            <Link key={p.slug} to={`/product/${p.slug}`} onClick={closeSearch}>
              <img src={p.images[0]} alt={p.name} />
              <span>
                <span style={{ display: 'block', fontSize: 13, lineHeight: 1.4 }}>{p.name}</span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{taka(p.price)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {query.trim() && results.length === 0 && (
        <p style={{ textAlign: 'center', color: '#767a7a', marginTop: 14 }}>
          No products found for “{query.trim()}”
        </p>
      )}
    </div>
  );
}
