import Button from './Button';
import Icon from './Icon';
import './cardarticle.css';

function ArticleImage({ image, tone, label, className = '', children }) {
  return (
    <div
      className={[
        'catalogue-product-photo',
        `catalogue-product-photo--${tone}`,
        image ? 'has-image' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {image && <img src={image} alt="" loading="lazy" />}
      <span>{label}</span>
      {children}
    </div>
  );
}

export default function CardArticle({
  product,
  isSelected,
  priceRange,
  onOpen,
  onToggle,
}) {
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(product.id);
    }
  }

  return (
    <article
      className="catalogue-product-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={handleKeyDown}
    >
      <ArticleImage image={product.image} tone={product.tone} label={product.category}>
        {product.images.length > 1 && (
          <small className="catalogue-product-photo__count">
            {product.images.length} images
          </small>
        )}
      </ArticleImage>

      <div className="catalogue-product-card__body">
        <div>
          <h3>{product.name}</h3>
          <p>{product.shop} · {product.shopZone}</p>
        </div>
        <strong>{priceRange}</strong>
        <Button
          type="button"
          size="sm"
          variant={isSelected ? 'outline' : 'primary'}
          icon={<Icon name={isSelected ? 'Check' : 'Add'} size="sm" />}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(product.id);
          }}
        >
          {isSelected ? 'Ajouté' : 'Ajouter'}
        </Button>
      </div>
    </article>
  );
}

function ThumbGrid({ product, activeIndex, onSelect }) {
  if (product.images.length <= 1) return null;

  return (
    <div className="catalogue-fullscreen__thumbs" aria-label="Images de l'article">
      {product.images.map((image, index) => (
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

export function ArticleFullscreen({
  product,
  image,
  imageIndex,
  isSelected,
  priceRange,
  onClose,
  onImageSelect,
  onToggle,
}) {
  return (
    <div className="catalogue-fullscreen" role="dialog" aria-modal="true" aria-label={product.name}>
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

            {product.images.length > 1 && (
              <small className="catalogue-product-photo__count">
                {product.images.length} images
              </small>
            )}
          </ArticleImage>

          <ThumbGrid product={product} activeIndex={imageIndex} onSelect={onImageSelect} />
        </div>
      </article>
    </div>
  );
}
