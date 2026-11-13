import { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { testimonials } from '../data/content';

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(4);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setPerView(w <= 575 ? 1 : w <= 991 ? 2 : w <= 1199 ? 3 : 4);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const pages = Math.max(1, testimonials.length - perView + 1);

  useEffect(() => {
    setIndex((i) => Math.min(i, pages - 1));
  }, [pages]);

  useEffect(() => {
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % pages),
      5000
    );
    return () => window.clearInterval(t);
  }, [pages]);

  return (
    <section className="testimonial testimonial-style-1 section-padding" aria-label="Customer reviews">
      <div className="container">
        <div className="section-head">
          <h3 className="title">Premium Jersey with affordable price ❤️❤️</h3>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              transition: 'transform .45s ease',
              transform: `translateX(calc(-${index} * (${100 / perView}% + ${16 / perView}px)))`,
            }}
          >
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="testimonial-card"
                style={{ flex: `0 0 calc(${100 / perView}% - ${(16 * (perView - 1)) / perView}px)`, margin: 0 }}
              >
                <p className="testimonial-text">{t.text}</p>
                <ul className="testimonial-rating" aria-label="5 star rating">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <li key={s}><FaStar size={15} color="#f8b400" /></li>
                  ))}
                </ul>
                <figcaption className="testimonial-author">
                  <div className="testimonial-author-thumbnail">
                    <img src={t.image} alt={t.name} loading="lazy" />
                  </div>
                  <div className="testimonial-info">
                    <h5>{t.name}</h5>
                    <span>Verified buyer</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="testimonial-pagination" role="tablist" aria-label="Review pagination">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              className={i === index ? 'active' : ''}
              aria-label={`Go to review page ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
