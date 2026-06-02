import './MaBoutique.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupplierShopCard from '../../../components/SupplierShopCard';
import { Alert } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { deleteSupplierProduct, fetchSupplierWorkspace, subscribeSupplierWorkspaceChange } from '../../../services/supplier';

export default function MaBoutique() {
  const navigate = useNavigate();
  const [adminData] = useAdminData();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  function loadWorkspace() {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger la boutique.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }

  useEffect(() => {
    const cancelLoad = loadWorkspace();
    const unsubscribe = subscribeSupplierWorkspaceChange(() => {
      loadWorkspace();
    });

    return () => {
      cancelLoad();
      unsubscribe();
    };
  }, []);

  const supplier = workspace?.supplier;
  const savedShopProfile = adminData.supplierSettings?.shopProfile || {};
  const shopName = savedShopProfile.name
    || supplier?.shopLabel
    || supplier?.storeLabel
    || supplier?.label
    || supplier?.name
    || supplier?.companyName
    || workspace?.user?.name
    || 'ArchiPrice Store';
  const backgroundImage = supplier?.coverImage?.secure_url
    || supplier?.coverImage?.url
    || supplier?.backgroundImage
    || supplier?.logo?.secure_url
    || supplier?.logo?.url
    || '';
  const products = workspace?.products || [];

  async function removeProduct(product) {
    const shouldDelete = window.confirm('Supprimer ce catalogue de votre boutique ?');
    if (!shouldDelete) return;

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

  return (
    <div className="supplier-shop-page">
      {isLoading && <section className="supplier-shop-card">Chargement de la boutique...</section>}
      {error && (
        <Alert variant="danger" className="supplier-shop-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <SupplierShopCard
          shopName={shopName}
          backgroundImage={backgroundImage}
          heroTitle={`Découvrez les nouveautés ${shopName}`}
          products={products}
          onAddProduct={() => navigate('/supplier/products/new')}
          onEditProduct={(product) => navigate(`/supplier/products/new?edit=${product.id}`)}
          onDeleteProduct={removeProduct}
        />
      )}
    </div>
  );
}
