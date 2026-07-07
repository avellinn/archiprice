import Button from '../../../components/Button';
import Icon from '../../../components/Icon';

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function ArticleImage({ image, tone, label, className = '', onClick, children }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={[
        'catalogue-product-photo',
        `catalogue-product-photo--${tone}`,
        image ? 'has-image' : '',
        onClick ? 'catalogue-product-photo--clickable' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick(event);
      }}
    >
      {image && <img src={image} alt="" loading="lazy" />}
      <span>{label}</span>
      {children}
    </div>
  );
}

function ThumbGrid({ product, activeIndex, onSelect }) {
  const images = Array.isArray(product.images) ? product.images.map(getImageUrl).filter(Boolean) : [];
  if (images.length <= 1) return null;

  return (
    <div className="catalogue-fullscreen__thumbs" aria-label="Images de l'article">
      {images.map((image, index) => (
        <button
          type="button"
          className={index === activeIndex ? 'is-active' : ''}
          key={`${image.slice(0, 28)}-${index}`}
          onClick={() => onSelect(index)}
          aria-label={`Afficher l'image ${index + 1}`}
        >
          <img src={image} alt="" />
        </button>
      ))}
    </div>
  );
}

/**
 * Modale plein écran pour la visualisation d'un article du catalogue.
 */
export default function CatalogueFullscreen({
  product,
  image,
  imageIndex,
  isSelected,
  priceRange,
  onClose,
  onImageSelect,
  onToggle,
}) {
  const images = Array.isArray(product.images) ? product.images : [];
  const canNavigate = images.length > 1;

  function showPreviousImage() {
    if (!canNavigate) return;
    onImageSelect((imageIndex - 1 + images.length) % images.length);
  }

  function showNextImage() {
    if (!canNavigate) return;
    onImageSelect((imageIndex + 1) % images.length);
  }

  return (
    <div
      className="catalogue-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <button
        type="button"
        className="catalogue-fullscreen__close"
        aria-label="Fermer le mode plein écran"
        onClick={onClose}
      >
        <Icon name="Close" />
      </button>

      <article className="catalogue-fullscreen__card">
        <div className="catalogue-fullscreen__media">
          {canNavigate && (
            <button
              type="button"
              className="catalogue-fullscreen__nav catalogue-fullscreen__nav--prev"
              onClick={showPreviousImage}
              aria-label="Image précédente"
            >
              <Icon name="ChevronLeft" />
            </button>
          )}

          <ArticleImage
            image={image}
            tone={product.tone}
            label={product.category}
            className="catalogue-fullscreen__visual"
          >
            <div className="catalogue-fullscreen__content">
              <span className="catalogue-eyebrow">{product.room} · {product.range}</span>
              <h2>{product.name}</h2>
              <p>{product.shop} · {product.shopZone}</p>
              <strong>{priceRange}</strong>
              <Button
                type="button"
                icon={<Icon name={isSelected ? 'Check' : 'Add'} size="sm" />}
                onClick={() => onToggle(product.id)}
              >
                {isSelected ? 'Retirer du choix' : 'Ajouter au budget'}
              </Button>
            </div>

            {images.length > 1 && (
              <small className="catalogue-product-photo__count">
                {imageIndex + 1}/{images.length}
              </small>
            )}
          </ArticleImage>

          {canNavigate && (
            <button
              type="button"
              className="catalogue-fullscreen__nav catalogue-fullscreen__nav--next"
              onClick={showNextImage}
              aria-label="Image suivante"
            >
              <Icon name="ChevronRight" />
            </button>
          )}

          <ThumbGrid product={product} activeIndex={imageIndex} onSelect={onImageSelect} />
        </div>
      </article>
    </div>
  );
}
