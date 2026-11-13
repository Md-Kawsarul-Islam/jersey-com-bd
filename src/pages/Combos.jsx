import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const COMBO_CARDS = [
  {
    href: '/category/football-club-jersey',
    image: '/assets/category-club.jpg',
    alt: 'Football Club Jersey',
    label: 'Football Club Jersey',
  },
  {
    href: '/category/football-country-jersey',
    image: '/assets/category-country.png',
    alt: 'Football Country Jersey',
    label: 'Football Country Jersey',
  },
  {
    href: '/category/half-sleeve-jersey-2',
    image: '/assets-products/bdea66dc6ed99f22.jpg',
    alt: 'Half Sleeve Jersey',
    label: 'Half Sleeve Jersey',
  },
];

export default function Combos() {
  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">Combo</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>Combos</li>
          </ul>
        </div>
      </div>

      <section className="section-padding">
        <div className="container">
          <div style={{ marginBottom: 22 }}>
            <Link to="/" className="sec-btn" style={{ textDecoration: 'none' }}>
              <FiArrowLeft /> <span>Back to Home</span>
            </Link>
          </div>
          <div className="category-inner">
            {COMBO_CARDS.map((card) => (
              <Link to={card.href} className="category-card" key={card.href + card.label}>
                <div className="category-img">
                  <img src={card.image} alt={card.alt} loading="lazy" />
                </div>
                <div className="category-info">
                  <p>{card.label}</p>
                </div>
              </Link>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 30, color: 'var(--hints-color)', fontSize: 13 }}>
            Tip: order 2+ jerseys in one checkout and delivery is FREE on orders above ৳2,000.
          </p>
        </div>
      </section>
    </main>
  );
}
