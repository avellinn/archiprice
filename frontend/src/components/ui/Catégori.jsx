import './Catégori.css';
import { useEffect, useMemo, useState } from 'react';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getProductImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const firstImage = images[0] || product?.image;

  if (!firstImage) return '';
  if (typeof firstImage === 'string') return firstImage;
  return firstImage.secure_url || firstImage.url || '';
}

function buildProductCategories(products = []) {
  const fallbackImages = products.map(getProductImage).filter(Boolean);
  const categoryMap = new Map();

  products.forEach((product) => {
    const label = String(product.category || '').trim();
    if (!label) return;

    const id = slugify(label);
    const image = getProductImage(product);
    const current = categoryMap.get(id);

    if (!current) {
      categoryMap.set(id, {
        id,
        label,
        value: label,
        image: image || fallbackImages[0] || '',
      });
      return;
    }

    if (!current.image && image) {
      categoryMap.set(id, { ...current, image });
    }
  });

  return [...categoryMap.values()];
}

export default function Categori({
  products = [],
  activeCategory = '',
  onSelect,
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const productCategories = useMemo(() => buildProductCategories(products), [products]);
  const visibleCategories = productCategories;
  const displayCount = Math.min(visibleCategories.length, 10);
  const safeSlideIndex = visibleCategories.length > 0 ? slideIndex % visibleCategories.length : 0;
  const animatedCategories = useMemo(() => (
    Array.from({ length: displayCount }, (_, index) => (
      visibleCategories[(safeSlideIndex + index) % visibleCategories.length]
    )).filter(Boolean)
  ), [displayCount, safeSlideIndex, visibleCategories]);

  useEffect(() => {
    if (isPaused || visibleCategories.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setSlideIndex((currentIndex) => (currentIndex + 1) % visibleCategories.length);
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, [isPaused, visibleCategories.length]);

  if (visibleCategories.length === 0) return null;

  return (
    <section
      className="categori"
      aria-label="Catégories"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        key={safeSlideIndex}
        className="categori__track"
        style={{
          '--categori-count': visibleCategories.length,
        }}
      >
        {animatedCategories.map((category, index) => (
          <button
            type="button"
            key={`${category.id}-${index}`}
            className={[
              'categori__item',
              activeCategory === category.value || activeCategory === category.label ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelect?.(category)}
          >
            <span
              className={[
                'categori__thumb',
                category.image ? 'categori__thumb--has-image' : '',
              ].filter(Boolean).join(' ')}
              aria-hidden="true"
            >
              {category.image ? (
                <img src={category.image} alt="" loading="lazy" />
              ) : (
                <span className={`categori__visual categori__visual--${category.id}`}>
                  <span />
                  <i />
                </span>
              )}
            </span>
            <span className="categori__label">{category.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
