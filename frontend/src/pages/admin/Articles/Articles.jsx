import './Articles.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon, Loader, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import {
  deleteAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
} from '../../../services/adminMongo';
import { connectRealtime } from '../../../services/realtime';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getStatusTone(status) {
  if (status === 'Validé') return 'success';
  if (status === 'En attente') return 'warning';
  if (status === 'Retiré') return 'neutral';
  return 'danger';
}

export default function Articles() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState('');

  const loadProducts = useCallback(() => {
    let cancelled = false;

    fetchAdminProducts()
      .then((items) => {
        if (cancelled) return;
        setProducts(items);
        setError('');
      })
      .catch((apiError) => {
        if (cancelled) return;
        setProducts([]);
        setError(getApiErrorMessage(apiError, 'Impossible de charger les articles.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadProducts(), [loadProducts]);

  useEffect(() => connectRealtime({
    onEvent: (event) => {
      if (event?.type === 'connected') return;
      loadProducts();
    },
  }), [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchParams.get('q')?.trim().toLowerCase() || '';
    const publicationStatus = searchParams.get('publicationStatus')?.trim().toLowerCase() || '';

    const productsByStatus = publicationStatus
      ? products.filter((product) => String(product.publicationStatus || '').toLowerCase() === publicationStatus)
      : products;

    if (!query) return productsByStatus;

    return productsByStatus.filter((product) => (
      String(product.name || '').toLowerCase().includes(query)
      || String(product.category || '').toLowerCase().includes(query)
      || String(product.supplierName || product.supplier || '').toLowerCase().includes(query)
      || String(product.publicationStatus || '').toLowerCase().includes(query)
    ));
  }, [products, searchParams]);
  const pendingPublicationCount = useMemo(() => (
    products.filter((product) => product.publicationStatus === 'En attente').length
  ), [products]);

  async function updatePublication(product, publicationStatus) {
    setBusyProductId(product.id);
    setError('');
    setSuccessMessage('');

    try {
      const updatedProduct = await updateAdminProduct(product.id, { publicationStatus });
      setProducts((currentProducts) => currentProducts.map((item) => (
        item.id === product.id ? updatedProduct : item
      )));
      setSuccessMessage(`Article ${publicationStatus.toLowerCase()}.`);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "L'action sur l'article a échoué."));
    } finally {
      setBusyProductId('');
    }
  }

  async function removeProduct(product) {
    setBusyProductId(product.id);
    setError('');
    setSuccessMessage('');

    try {
      await deleteAdminProduct(product.id);
      setProducts((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
      if (selectedProduct?.id === product.id) setSelectedProduct(null);
      setSuccessMessage('Article supprimé définitivement.');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "La suppression de l'article a échoué."));
    } finally {
      setBusyProductId('');
    }
  }

  function getProductImage(product) {
    if (product?.image) return product.image;
    const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
    if (!firstImage) return '';
    if (typeof firstImage === 'string') return firstImage;
    return firstImage.secure_url || firstImage.url || '';
  }

  function renderActions(product) {
    const isBusy = busyProductId === product.id;
    const isValidated = product.publicationStatus === 'Validé';
    const isWithdrawn = product.publicationStatus === 'Retiré';

    return (
      <span className="admin-articles-actions">
        {!isValidated && (
          <button
            type="button"
            title="Valider"
            disabled={isBusy}
            onClick={(event) => {
              event.stopPropagation();
              updatePublication(product, 'Validé');
            }}
          >
            <Icon name="Check" size="sm" />
          </button>
        )}
        {!isWithdrawn && (
          <button
            type="button"
            title="Retirer du catalogue"
            disabled={isBusy}
            onClick={(event) => {
              event.stopPropagation();
              updatePublication(product, 'Retiré');
            }}
          >
            <Icon name="VisibilityOff" size="sm" />
          </button>
        )}
        <button
          type="button"
          title="Supprimer définitivement"
          className="is-danger"
          disabled={isBusy}
          onClick={(event) => {
            event.stopPropagation();
            removeProduct(product);
          }}
        >
          <Icon name="Delete" size="sm" />
        </button>
      </span>
    );
  }

  const columns = [
    {
      key: 'name',
      label: 'Article',
      render: (_value, product) => (
        <span className="admin-articles-product">
          {product.image ? <img src={product.image} alt="" /> : <i aria-hidden="true" />}
          <span>
            <strong>{product.name}</strong>
            <small>{product.category || 'Catégorie non renseignée'}</small>
          </span>
        </span>
      ),
    },
    {
      key: 'supplierName',
      label: 'Fournisseur',
      render: (_value, product) => product.supplierName || product.supplier || '-',
    },
    {
      key: 'unitPrice',
      label: 'Prix',
      render: (price) => formatFCFA(price),
    },
    {
      key: 'publicationStatus',
      label: 'Statut',
      render: (status) => (
        <Badge tone={getStatusTone(status)}>
          {status || 'Brouillon'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Date',
      render: (date) => formatDate(date),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, product) => renderActions(product),
    },
  ];

  return (
    <div className="admin-articles-page">
      <header className="admin-articles-header">
        <div>
          <span className="admin-articles-eyebrow">Catalogue fournisseur</span>
          <h1>Articles</h1>
        </div>
        <Badge tone={pendingPublicationCount > 0 ? 'warning' : 'neutral'} className="admin-articles-notification-badge">
          {pendingPublicationCount} nouvelle(s) publication(s)
        </Badge>
      </header>

      {error && (
        <Alert variant="danger" className="admin-articles-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="admin-articles-alert" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {isLoading ? (
        <Loader label="Chargement des articles..." />
      ) : (
        <Table
          className="admin-articles-list"
          columns={columns}
          data={filteredProducts}
          getRowId={(product, index) => product.id || `${product.name}-${index}`}
          onRowClick={setSelectedProduct}
          emptyLabel="Aucun article fournisseur trouvé."
        />
      )}

      {selectedProduct && (
        <div className="invoices-detail-modal" role="dialog" aria-modal="true" aria-label="Détails de l'article">
          <section className="invoices-detail-card">
            <header>
              <div>
                <span>{selectedProduct.supplierName || selectedProduct.supplier || 'Fournisseur'}</span>
                <h2>{selectedProduct.name || 'Article sans nom'}</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setSelectedProduct(null)}>
                <Icon name="Close" size="sm" />
              </button>
            </header>
            <div className="invoices-detail-list">
              <article>
                <a
                  className={[
                    'invoices-detail-image',
                    getProductImage(selectedProduct) ? 'invoices-detail-image--available' : '',
                  ].filter(Boolean).join(' ')}
                  href={getProductImage(selectedProduct) || undefined}
                  target={getProductImage(selectedProduct) ? '_blank' : undefined}
                  rel="noreferrer"
                  aria-label={getProductImage(selectedProduct) ? `Voir l'image de ${selectedProduct.name}` : undefined}
                  onClick={(event) => {
                    if (!getProductImage(selectedProduct)) event.preventDefault();
                  }}
                >
                  {getProductImage(selectedProduct)
                    ? <img src={getProductImage(selectedProduct)} alt={selectedProduct.name || 'Article'} />
                    : <Icon name="Tag" size="sm" />}
                </a>
                <div>
                  <strong>{selectedProduct.name || 'Article sans nom'}</strong>
                  <span>{selectedProduct.category || 'Catégorie non renseignée'}</span>
                  {getProductImage(selectedProduct) && (
                    <a href={getProductImage(selectedProduct)} target="_blank" rel="noreferrer">
                      Voir image Cloudinary
                    </a>
                  )}
                </div>
                <small>{selectedProduct.publicationStatus || 'Brouillon'}</small>
                <b>{formatFCFA(selectedProduct.unitPrice || selectedProduct.price)}</b>
              </article>

              <article className="admin-article-detail-row">
                <Icon name="Info" size="sm" />
                <div>
                  <strong>Description</strong>
                  <span>{selectedProduct.description || 'Description non renseignée'}</span>
                </div>
                <small>{selectedProduct.room || 'Pièce -'}</small>
                <b>{selectedProduct.range || 'Gamme -'}</b>
              </article>

              <article className="admin-article-detail-row">
                <Icon name="Workspaces" size="sm" />
                <div>
                  <strong>Fournisseur</strong>
                  <span>{selectedProduct.supplierName || selectedProduct.supplier || '-'}</span>
                </div>
                <small>{selectedProduct.availability || 'Disponibilité -'}</small>
                <b>{formatDate(selectedProduct.updatedAt || selectedProduct.createdAt)}</b>
              </article>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
