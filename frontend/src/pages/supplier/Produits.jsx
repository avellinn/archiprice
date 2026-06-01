import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import { deleteSupplierProduct, fetchSupplierWorkspace } from '../../services/supplier';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

export default function Produits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProductId, setDeletingProductId] = useState('');

  function loadProducts() {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products || []);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les produits.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }

  useEffect(() => {
    const cancelLoad = loadProducts();
    return cancelLoad;
  }, []);

  const query = searchParams.get('q')?.trim().toLowerCase() || '';
  const filteredProducts = useMemo(() => (
    products.filter((product) => (
      !query
      || String(product.name || '').toLowerCase().includes(query)
      || String(product.category || '').toLowerCase().includes(query)
    ))
  ), [products, query]);

  async function removeProduct(productId) {
    setDeletingProductId(productId);
    setError('');

    try {
      await deleteSupplierProduct(productId);
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de supprimer le produit.'));
    } finally {
      setDeletingProductId('');
    }
  }

  return (
    <div className="supplier-products-page">
      <header className="supplier-products-header">
        <h1>
          <Icon name="Tag" size="sm" />
          Produits
        </h1>
      </header>

      <section className="supplier-products-onboarding-card">
        <div className="supplier-products-onboarding-card__content">
          <h2>Ajoutez vos produits</h2>
          <p>Commencez par ajouter à votre boutique des produits qui plairont à vos clients.</p>
          <div className="supplier-products-actions">
            <Button type="button" size="sm" onClick={() => navigate('/supplier/products/new')}>
              Ajouter un produit
            </Button>
            
          </div>
        </div>
        <div className="supplier-products-hero-art" aria-hidden="true">
          <div className="supplier-products-stack supplier-products-stack--back">
            <span className="supplier-product-visual supplier-product-visual--chair" />
          </div>
          <div className="supplier-products-stack supplier-products-stack--front">
            <Icon name="Tag" size="lg" />
            <span />
          </div>
          <div className="supplier-products-stack supplier-products-stack--side">
            <span className="supplier-product-visual supplier-product-visual--sofa" />
          </div>
        </div>
      </section>

      {(isLoading || error || filteredProducts.length > 0) && (
        <section className="workspace-card supplier-dashboard__products supplier-products-list">
          <h2>Produits ajoutés</h2>
          {error && <p className="auth-error">{error}</p>}
          {isLoading ? (
            <p className="muted">Chargement des produits...</p>
          ) : (
            <div className="supplier-products-table-wrap">
              <table className="supplier-products-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Pièce</th>
                    <th>Gamme</th>
                    <th>Prix</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6">Aucun produit ajouté.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                          <span>{product.availability || 'Disponibilité non renseignée'}</span>
                        </td>
                        <td>{product.category || '-'}</td>
                        <td>{product.room || '-'}</td>
                        <td>{product.range || '-'}</td>
                        <td>{formatFCFA(product.unitPrice)}</td>
                        <td>
                          <span className="supplier-products-table__actions">
                            <button type="button" title="Modifier" onClick={() => navigate(`/supplier/products/new?edit=${product.id}`)}>
                              <Icon name="Edit" size="sm" />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              className="is-danger"
                              disabled={deletingProductId === product.id}
                              onClick={() => removeProduct(product.id)}
                            >
                              <Icon name="Delete" size="sm" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
