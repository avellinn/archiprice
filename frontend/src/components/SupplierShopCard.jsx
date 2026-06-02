import { Button, Icon } from './ui';
import './SupplierShopCard.css';

function getShortShopName(shopName) {
  return String(shopName || 'archiprice').slice(0, 12).toLowerCase();
}

function getProductImage(product) {
  const image = Array.isArray(product.images) ? product.images[0] : product.image;

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function handleCardKeyDown(event, callback) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  event.preventDefault();
  callback();
}

export default function SupplierShopCard({
  shopName = 'ArchiPrice Store',
  heroTitle,
  backgroundImage = '',
  products = [],
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}) {
  const shortName = getShortShopName(shopName);
  const displayHeroTitle = heroTitle || `Découvrez les nouveautés ${shopName}`;
  const shopStyle = backgroundImage
    ? { '--supplier-shop-hero-background': `linear-gradient(rgba(17, 24, 39, 0.12), rgba(17, 24, 39, 0.24)), url("${backgroundImage}")` }
    : undefined;

  return (
    <>
      <section className="supplier-shop-card" style={shopStyle}>
        <div className="supplier-shop-preview" aria-label="Aperçu de la boutique">
          <div className="supplier-shop-preview__desktop">
            <div className="supplier-shop-preview__topbar">
              <strong>{shortName}</strong>
              <span>Home</span>
              <span>Catalog</span>
              <i />
              <Icon name="Search" size="sm" />
              <Icon name="Workspaces" size="sm" />
            </div>
            <div className="supplier-shop-preview__hero">
              <div>
                <h2>{displayHeroTitle}</h2>
              </div>
            </div>
          </div>

          <div className="supplier-shop-preview__mobile">
            <div className="supplier-shop-preview__mobilebar">
              <span className="supplier-shop-preview__hamburger">☰</span>
              <Icon name="Search" size="sm" />
              <strong>{shortName}</strong>
              <Icon name="Workspaces" size="sm" />
            </div>
            <div className="supplier-shop-preview__mobilehero">
              <h3>{displayHeroTitle}</h3>
            </div>
            <div className="supplier-shop-preview__products">
              <strong>Products</strong>
              <span />
              <span />
            </div>
          </div>
        </div>

        <footer className="supplier-shop-footer">
          <Button
            type="button"
            size="sm"
            icon={<Icon name="Add" size="sm" />}
            onClick={onAddProduct}
          >
            Ajouter
          </Button>
        </footer>
      </section>

      <section className="supplier-shop-new-products" aria-label="Nouveautés de la boutique">
        <div className="supplier-shop-new-products__header">
          <h1>Nouveautés</h1>
        </div>

        {products.length === 0 ? (
          <p className="supplier-shop-new-products__empty">Aucun catalogue créé pour le moment.</p>
        ) : (
          <div className="supplier-shop-new-products__grid">
            {products.map((product) => {
              const image = getProductImage(product);
              const editProduct = () => onEditProduct?.(product);

              return (
                <article
                  key={product.id}
                  className="supplier-shop-product-card"
                  tabIndex={0}
                  role="button"
                  onClick={editProduct}
                  onKeyDown={(event) => handleCardKeyDown(event, editProduct)}
                >
                  <div className="supplier-shop-product-card__media">
                    {image ? <img src={image} alt={product.name} /> : <Icon name="Tag" size="lg" />}
                  </div>
                  <div className="supplier-shop-product-card__body">
                    <h2>{product.name || 'Produit sans nom'}</h2>
                    <p>{product.category || 'Catégorie non renseignée'}</p>
                    <strong>{formatFCFA(product.unitPrice)}</strong>
                  </div>
                  <div className="supplier-shop-product-card__actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" title="Modifier" onClick={editProduct}>
                      <Icon name="Edit" size="sm" />
                    </button>
                    <button type="button" title="Supprimer" className="is-danger" onClick={() => onDeleteProduct?.(product)}>
                      <Icon name="Delete" size="sm" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
