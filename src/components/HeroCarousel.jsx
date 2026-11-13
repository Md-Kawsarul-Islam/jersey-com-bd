import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { banners } from '../data/content';

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  const go = useCallback(
    (i) => setIndex(((i % count) + count) % count),
    [count]
  );

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => window.clearInterval(t);
  }, [count]);

  return (
    <section className="hero style-6" aria-label="Featured promotions">
      <div className="container">
        <div className="swiper-wrap">
          <div className="hero-viewport">
            <div
              className="hero-track"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {banners.map((banner, i) => (
                <div className="hero-slide" key={i} aria-hidden={i !== index}>
                  <Link to={banner.href} tabIndex={i === index ? 0 : -1}>
                    <img
                      src={banner.image}
                      alt={banner.alt}
                      loading="eager"
                      fetchPriority={i === 0 ? 'high' : 'low'}
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-pagination" role="tablist" aria-label="Banner pagination">
            {banners.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Banner ${i + 1}`}
                className={i === index ? 'active' : ''}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
