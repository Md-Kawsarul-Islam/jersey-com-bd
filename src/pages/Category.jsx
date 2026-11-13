import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../context/ProductsContext';

export default function Category() {
  const { getByCategory, categoryName, categories } = useProducts();
  const { slug } = useParams();
  const list = getByCategory(slug);
  const name = categoryName(slug);
  const known = categories.some((c) => c.slug === slug);

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">{known ? name : 'Category not found'}</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>{known ? name : 'Unknown'}</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding">
        {list.length === 0 ? (
          <div className="empty-state">
            <h2>No products here yet</h2>
            <p>
              {slug === 'full-sleeve-jersey-2'
                ? 'Country full-sleeve jerseys are restocking soon. Meanwhile, check the half-sleeve range.'
                : 'This category is being restocked. Please check back soon.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn-primary" to="/category/half-sleeve-jersey-2">Half Sleeve Country Jerseys</Link>
              <Link className="btn-outline" to="/shop">Browse all products</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="shop-count" style={{ marginBottom: 16 }}>{list.length} product{list.length === 1 ? '' : 's'}</p>
            <div className="product-grid cols-4">
              {list.map((p) => (
                <ProductCard product={p} key={p.slug} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
