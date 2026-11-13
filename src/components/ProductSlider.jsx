import { useEffect, useRef, useState, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ProductCard from './ProductCard';

/**
 * Horizontal auto-advancing product slider (mirrors the reference
 * "Full Sleeve Jersey" swiper: 5/4/3/2 slides per view).
 */
export default function ProductSlider({ products }) {
  const trackRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(5);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const pv = w <= 575 ? 2 : w <= 767 ? 3 : w <= 991 ? 4 : 5;
      setPerView(pv);
      const track = trackRef.current;
      if (track && track.children[0]) {
        const slideW = track.children[0].getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
        setStep(slideW + gap);
      }
    };
    compute();
    window.addEventListener('resize', compute);
    // recompute after images settle
    const t = window.setTimeout(compute, 400);
    return () => {
      window.removeEventListener('resize', compute);
      window.clearTimeout(t);
    };
  }, [products]);

  const maxOffset = Math.max(0, products.length - perView);

  useEffect(() => {
    setOffset((o) => Math.min(o, maxOffset));
  }, [maxOffset]);

  useEffect(() => {
    if (paused || maxOffset === 0) return undefined;
    const t = window.setInterval(
      () => setOffset((o) => (o >= maxOffset ? 0 : o + 1)),
      3500
    );
    return () => window.clearInterval(t);
  }, [paused, maxOffset]);

  const clamp = useCallback(
    (v) => Math.max(0, Math.min(maxOffset, v)),
    [maxOffset]
  );

  return (
    <div
      className="product-slider-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        className="slider-arrow prev"
        aria-label="Scroll products left"
        onClick={() => setOffset((o) => clamp(o - 1))}
      >
        <FiChevronLeft size={22} />
      </button>
      <div style={{ overflow: 'hidden' }}>
        <div
          ref={trackRef}
          className="product-slider-track"
          style={{ transform: `translateX(-${offset * step}px)` }}
        >
          {products.map((p) => (
            <ProductCard product={p} key={p.slug} />
          ))}
        </div>
      </div>
      <button
        className="slider-arrow next"
        aria-label="Scroll products right"
        onClick={() => setOffset((o) => clamp(o + 1))}
      >
        <FiChevronRight size={22} />
      </button>
    </div>
  );
}
