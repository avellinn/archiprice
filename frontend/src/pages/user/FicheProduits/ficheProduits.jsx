import './ficheProduits.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../../components/Icon';
import { Alert, Button, Loader } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { fetchCatalogueProduct } from '../../../services/catalogueProducts';

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function buildDescriptionParagraphs(description = '') {
  const cleanDescription = String(description || '').trim();
  if (!cleanDescription) {
    return [
      'Cet article publié par un fournisseur ArchiPrice est disponible pour vos simulations et peut être comparé avec les autres références du catalogue.',
      'Les informations techniques sont consolidées depuis la fiche fournisseur afin de faciliter la sélection, le chiffrage et la préparation du projet.',
    ];
  }

  return cleanDescription
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function FicheProduits() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchCatalogueProduct(productId)
      .then((item) => {
        if (cancelled) return;
        setProduct(item);
        setActiveImageIndex(0);
        setError('');
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger la fiche produit.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const images = useMemo(() => {
    const imageList = Array.isArray(product?.images)
      ? product.images.map(getImageUrl).filter(Boolean)
      : [];
    const primaryImage = getImageUrl(product?.image);
    return [...new Set([primaryImage, ...imageList].filter(Boolean))];
  }, [product]);
  const activeImage = images[activeImageIndex] || '';
  const descriptionParagraphs = useMemo(
    () => buildDescriptionParagraphs(product?.description),
    [product?.description],
  );
  const publicationYear = useMemo(() => {
    const sourceDate = product?.approvedAt || product?.updatedAt || product?.createdAt;
    if (!sourceDate) return 'Non renseignée';
    const year = new Date(sourceDate).getFullYear();
    return Number.isFinite(year) ? year : 'Non renseignée';
  }, [product?.approvedAt, product?.createdAt, product?.updatedAt]);

  function showPreviousImage() {
    if (images.length <= 1) return;
    setActiveImageIndex((currentIndex) => (currentIndex - 1 + images.length) % images.length);
  }

  function showNextImage() {
    if (images.length <= 1) return;
    setActiveImageIndex((currentIndex) => (currentIndex + 1) % images.length);
  }

  if (isLoading) {
    return <Loader className="product-sheet-loader" label="Chargement de la fiche produit..." />;
  }

  if (error || !product) {
    return (
      <main className="product-sheet-page">
        <Alert variant="danger">{error || 'Article introuvable.'}</Alert>
        <Button type="button" variant="outline" icon={<Icon name="ArrowLeft" size="sm" />} onClick={() => navigate(-1)}>
          Retour
        </Button>
      </main>
    );
  }

  return (
    <main className="product-sheet-page">
      <button type="button" className="product-sheet-back" onClick={() => navigate(-1)} aria-label="Retour">
        <Icon name="ArrowLeft" size="sm" />
      </button>

      <section className="product-sheet-layout">
        <article className="product-sheet-content">
          <header className="product-sheet-title">
            <span>{product.category || 'Article publié'}</span>
            <h1>{product.name}</h1>
            <p>{product.supplierName || product.shop || 'Fournisseur ArchiPrice'}</p>
          </header>

          <dl className="product-sheet-meta">
            <div>
              <dt>Collection</dt>
              <dd>{product.range || 'Collection fournisseur'}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{product.room || product.category || 'Non renseigné'}</dd>
            </div>
            <div>
              <dt>Année de publication</dt>
              <dd>{publicationYear}</dd>
            </div>
            <div>
              <dt>Code produit</dt>
              <dd>{String(product.id || '').slice(-8).toUpperCase()}</dd>
            </div>
          </dl>

          <div className="product-sheet-copy">
            {descriptionParagraphs.map((paragraph, index) => (
              <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
            ))}
          </div>

          <section className="product-sheet-info">
            <h2>Principales informations du produit</h2>
            <details open>
              <summary>
                Dimensions et tarif
                <Icon name="ChevronDown" size="sm" />
              </summary>
              <div>
                <strong>{product.range || product.category || product.name}</strong>
                <span>Prix unitaire: {formatFCFA(product.unitPrice)}</span>
                <span>Unité: {product.unit || 'u'}</span>
                <span>Disponibilité: {product.availability || 'Non renseignée'}</span>
                <span>Zone: {[product.city, product.neighborhood].filter(Boolean).join(', ') || 'Non renseignée'}</span>
              </div>
            </details>
          </section>
        </article>

        <aside className="product-sheet-gallery" aria-label="Galerie produit">
          <div className="product-sheet-main-image">
            {activeImage ? (
              <img src={activeImage} alt={product.name} />
            ) : (
              <span>{String(product.name || 'AP').slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="product-sheet-actions">
            <Button type="button" size="sm">Contactez la société</Button>
            <Button type="button" size="sm" variant="outline">Site Internet</Button>
          </div>

          <div className="product-sheet-thumbs">
            {images.slice(0, 12).map((image, index) => (
              <button
                type="button"
                className={index === activeImageIndex ? 'is-active' : ''}
                key={`${image}-${index}`}
                onClick={() => setActiveImageIndex(index)}
                aria-label={`Afficher l'image ${index + 1}`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>

          <footer className="product-sheet-gallery-footer">
            <button type="button">Afficher tous</button>
            <span>
              <button type="button" onClick={showPreviousImage} aria-label="Image précédente">
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <button type="button" onClick={showNextImage} aria-label="Image suivante">
                <Icon name="ChevronRight" size="sm" />
              </button>
            </span>
          </footer>
          <small>Revendeur {product.supplierName || product.shop || 'ArchiPrice'}</small>
        </aside>
      </section>
    </main>
  );
}
