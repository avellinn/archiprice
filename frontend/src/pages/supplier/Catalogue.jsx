import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Text } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import { createAdminId, useAdminData } from '../../services/adminData';
import { fetchSupplierWorkspace } from '../../services/supplier';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function getProductImage(product) {
  const image = Array.isArray(product.images) ? product.images[0] : product.image;

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function getProductInitials(name) {
  return String(name || 'AP')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Catalogue() {
  const [searchParams] = useSearchParams();
  const [adminData, setAdminData] = useAdminData();
  const [products, setProducts] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [submittedProductIds, setSubmittedProductIds] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products || []);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger le catalogue.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const query = searchParams.get('q')?.trim().toLowerCase() || '';
  const filteredProducts = useMemo(() => (
    products.filter((product) => (
      !query
      || String(product.name || '').toLowerCase().includes(query)
      || String(product.category || '').toLowerCase().includes(query)
    ))
  ), [products, query]);

  const publishedProductIds = useMemo(() => new Set([
    ...submittedProductIds,
    ...(adminData.products || [])
      .map((product) => product.sourceSupplierProductId)
      .filter(Boolean),
  ]), [adminData.products, submittedProductIds]);

  function publishProduct(product) {
    setAdminData((currentData) => {
      const alreadyExists = (currentData.products || []).some((item) => item.sourceSupplierProductId === product.id);

      if (alreadyExists) return currentData;

      const image = getProductImage(product);

      return {
        ...currentData,
        products: [
          {
            id: createAdminId('supplier-product'),
            sourceSupplierProductId: product.id,
            supplierUserId: product.supplierUserId,
            name: product.name,
            description: product.description,
            price: product.unitPrice,
            image,
            images: product.images || [],
            category: product.category,
            room: product.room,
            range: product.range,
            supplier: 'Ma boutique',
            vat: '20%',
            visual: 'sofa',
            city: 'Cotonou',
            neighborhood: '',
            availability: product.availability || 'Disponible',
            publicationStatus: 'En attente',
            publicationSource: 'supplier',
            submittedAt: new Date().toISOString(),
          },
          ...(currentData.products || []),
        ],
      };
    });
    setSubmittedProductIds((currentIds) => [...new Set([...currentIds, product.id])]);
  }

  return (
    <div className="supplier-catalogue-page">
      <header className="supplier-catalogue-header">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Visibilité boutique
          </Text>
          <h1>Catalogue</h1>
        </div>
        <div className="supplier-catalogue-view-toggle" aria-label="Mode d'affichage catalogue">
          <button type="button" className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')}>
           
            Card
          </button>
          <button type="button" className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}>
            
            Liste
          </button>
        </div>
      </header>

      {error && <p className="auth-error supplier-catalogue-state">{error}</p>}
      {isLoading ? (
        <p className="muted supplier-catalogue-state">Chargement du catalogue...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="muted supplier-catalogue-state">Aucun produit disponible dans votre catalogue.</p>
      ) : (
        <section className={`supplier-catalogue-grid supplier-catalogue-grid--${viewMode}`} aria-label="Produits du catalogue fournisseur">
          {filteredProducts.map((product) => {
            const image = getProductImage(product);
            const isSubmitted = publishedProductIds.has(product.id);

            return (
              <article key={product.id} className="supplier-catalogue-card">
                <div className="supplier-catalogue-card__media">
                  {image ? (
                    <img src={image} alt={product.name} />
                  ) : (
                    <span>{getProductInitials(product.name)}</span>
                  )}
                 
                </div>
                <div className="supplier-catalogue-card__body">
                  <span className="supplier-catalogue-card__avatar">{getProductInitials(product.name)}</span>
                  <div>
                    <h2>{product.name || 'Produit sans nom'}</h2>
                    <p>{product.category || 'Catégorie non renseignée'}</p>
                    <small>{formatFCFA(product.unitPrice)}</small>
                  </div>
                  <button type="button" aria-label="Options du produit" className="supplier-catalogue-card__menu">
                  
                  </button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSubmitted ? 'success' : 'primary'}
                  fullWidth
                  disabled={isSubmitted}
                  onClick={() => publishProduct(product)}
                >
                  {isSubmitted ? 'Publié' : 'Publier'}
                </Button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
