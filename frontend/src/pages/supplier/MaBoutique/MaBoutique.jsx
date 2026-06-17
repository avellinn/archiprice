import './MaBoutique.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupplierShopCard from '../../../components/SupplierShopCard';
import { Alert, Loader } from '../../../components/ui';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { deleteSupplierProduct, fetchSupplierWorkspace, subscribeSupplierWorkspaceChange } from '../../../services/supplier';

export default function MaBoutique() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingProductDelete, setPendingProductDelete] = useState(null);

  const loadWorkspace = useCallback(() => {
    fetchSupplierWorkspace()
      .then((data) => {
        setWorkspace(data);
        setError('');
      })
      .catch((apiError) => {
        setError(getApiErrorMessage(apiError, 'Impossible de charger la boutique.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadWorkspace();
    const unsubscribe = subscribeSupplierWorkspaceChange(loadWorkspace);
    return unsubscribe;
  }, [loadWorkspace]);

  useRealtimeRefresh(loadWorkspace, ['supplier-products', 'admin-products', 'suppliers']);

  const supplier = workspace?.supplier;
  const shopName = supplier?.companyName
    || supplier?.shopLabel
    || supplier?.storeLabel
    || supplier?.label
    || supplier?.name
    || workspace?.user?.name
    || workspace?.user?.email
    || '';
  const backgroundImage = supplier?.coverImage?.secure_url
    || supplier?.coverImage?.url
    || supplier?.backgroundImage
    || supplier?.logo?.secure_url
    || supplier?.logo?.url
    || '';
  const products = workspace?.products || [];

  async function confirmProductDelete() {
    const product = pendingProductDelete;
    if (!product) return;

    setPendingProductDelete(null);

    try {
      await deleteSupplierProduct(product.id);
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        products: (currentWorkspace?.products || []).filter((item) => item.id !== product.id),
      }));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de supprimer ce catalogue.'));
    }
  }

  function removeProduct(product) {
    setPendingProductDelete(product);
  }

  return (
    <div className="supplier-shop-page">
      {isLoading && <Loader label="Chargement de la boutique..." />}
      {error && (
        <Alert variant="danger" className="supplier-shop-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {pendingProductDelete && (
        <Alert
          variant="warning"
          title="Suppression catalogue"
          className="supplier-shop-alert supplier-shop-confirm-alert"
          onClose={() => setPendingProductDelete(null)}
        >
          <span>Supprimer ce catalogue de votre boutique ?</span>
          <span className="supplier-shop-confirm-alert__actions">
            <button type="button" onClick={() => setPendingProductDelete(null)}>Annuler</button>
            <button type="button" onClick={confirmProductDelete}>Supprimer</button>
          </span>
        </Alert>
      )}

      {!isLoading && !error && (
        <SupplierShopCard
          shopName={shopName}
          backgroundImage={backgroundImage}
          heroTitle={shopName ? `Découvrez les nouveautés ${shopName}` : 'Découvrez les nouveautés'}
          products={products}
          onAddProduct={() => navigate('/supplier/products/new')}
          onEditProduct={(product) => navigate(`/supplier/products/new?edit=${product.id}`)}
          onDeleteProduct={removeProduct}
        />
      )}
    </div>
  );
}
