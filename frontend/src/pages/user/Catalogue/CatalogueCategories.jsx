import { useEffect, useMemo, useState } from 'react';
import { Text } from '../../../components/ui';

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildProductCategories(products = []) {
  const fallbackImages = products.flatMap((product) => {
    const images = Array.isArray(product?.images) ? product.images : [];
    return [product?.image, ...images].map(getImageUrl).filter(Boolean);
  });

  const categoryMap = new Map();

  products.forEach((product) => {
    const label = String(product.category || '').trim();
    if (!label) return;

    const id = slugify(label);
    const images = [
      product.image,
      ...(Array.isArray(product.images) ? product.images : []),
    ].map(getImageUrl).filter(Boolean);
    const current = categoryMap.get(id);

    if (!current) {
      categoryMap.set(id, {
        id,
        label,
        value: label,
        images: [...new Set(images.length > 0 ? images : fallbackImages.slice(0, 4))],
      });
      return;
    }

    if (images.length > 0) {
      categoryMap.set(id, {
        ...current,
        images: [...new Set([...(current.images || []), ...images])].slice(0, 5),
      });
    }
  });

  return [...categoryMap.values()];
}

function CategoryThumbnail({ images }) {
  const [slide, setSlide] = useState({ activeIndex: 0, previousIndex: -1 });

  useEffect(() => {
    if (images.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setSlide(({ activeIndex }) => ({
        previousIndex: activeIndex,
        activeIndex: (activeIndex + 1) % images.length,
      }));
    }, 3800);
    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <span
      className={[
        'catalogue-categories__thumb',
        images.length ? 'catalogue-categories__thumb--has-image' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {images.map((image, imageIndex) => (
        <img
          src={image}
          alt=""
          loading="lazy"
          key={`${image}-${imageIndex}`}
          className={[
            imageIndex === slide.activeIndex ? 'is-active' : '',
            imageIndex === slide.previousIndex ? 'is-previous' : '',
          ].filter(Boolean).join(' ')}
        />
      ))}
    </span>
  );
}

/**
 * Barre de catégories horizontale avec miniatures animées.
 */
export default function CatalogueCategories({ products = [], activeCategory = '', onSelect }) {
  const categories = useMemo(() => buildProductCategories(products), [products]);

  function handleSelect(category) {
    const value = category?.value || category?.label || '';
    if (activeCategory === value) {
      onSelect?.({ value: 'Tout', label: 'Tout' });
      return;
    }
    onSelect?.(category);
  }

  if (categories.length === 0) return null;

  return (
    <section className="catalogue-categories" aria-label="Catégories">
      <div className="catalogue-categories__scroll">
        {categories.map((category, index) => (
          <button
            type="button"
            key={`${category.id}-${index}`}
            className={[
              'catalogue-categories__item',
              activeCategory === category.value || activeCategory === category.label ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            style={{ '--category-index': index }}
            onClick={() => handleSelect(category)}
          >
            <CategoryThumbnail
              key={(category.images || []).join('|')}
              images={category.images || []}
            />
            <Text as="span" variant="bold" size="sm" className="catalogue-categories__label">
              {category.label}
            </Text>
          </button>
        ))}
      </div>
    </section>
  );
}
