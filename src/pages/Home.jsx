import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import HeroCarousel from '../components/HeroCarousel';
import ProductCard from '../components/ProductCard';
import ProductSlider from '../components/ProductSlider';
import Testimonials from '../components/Testimonials';
import { useProducts } from '../context/ProductsContext';

export default function Home() {
  const { getByCategory } = useProducts();
  const fullSleeve = getByCategory('full-sleeve-jersey');
  const club = getByCategory('football-club-jersey').filter(
    (p) => !p.categories.includes('full-sleeve-jersey')
  ).slice(0, 10);
  const country = getByCategory('football-country-jersey')
    .filter((p) => !p.categories.includes('full-sleeve-jersey'))
    .slice(0, 10);

  return (
    <main>
      <HeroCarousel />

      {/* Full Sleeve Jersey — horizontal slider */}
      <section className="product-slider style-4 section-padding" aria-label="Full Sleeve Jersey">
        <div className="container">
          <div className="section-head">
            <h3 className="title">Full Sleeve Jersey</h3>
            <Link to="/category/full-sleeve-jersey" className="sec-btn">
              <span>View all items</span>
              <FiArrowRight />
            </Link>
          </div>
        </div>
        <div className="container">
          <ProductSlider products={fullSleeve} />
        </div>
      </section>

      {/* Football Club Jersey — grid */}
      <section className="product-section style-3 section-padding" aria-label="Football Club Jersey" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h3 className="title">Football Club Jersey</h3>
            <Link to="/category/football-club-jersey" className="sec-btn">
              <span>View all items</span>
              <FiArrowRight />
            </Link>
          </div>
          <div className="product-grid">
            {club.map((p) => (
              <ProductCard product={p} key={p.slug} />
            ))}
          </div>
        </div>
      </section>

      {/* Football Country Jersey — grid */}
      <section className="product-section style-3 section-padding" aria-label="Football Country Jersey" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h3 className="title">Football Country Jersey</h3>
            <Link to="/category/football-country-jersey" className="sec-btn">
              <span>View all items</span>
              <FiArrowRight />
            </Link>
          </div>
          <div className="product-grid">
            {country.map((p) => (
              <ProductCard product={p} key={p.slug} />
            ))}
          </div>
        </div>
      </section>

      <Testimonials />
    </main>
  );
}
