import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupplierShopCard from '../../components/SupplierShopCard';
import { getApiErrorMessage } from '../../services/api';
import { deleteSupplierProduct, fetchSupplierWorkspace } from '../../services/supplier';

export default function MaBoutique() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    return () => {
      cancelled = true;
    };
  }, []);

  const supplier = workspace?.supplier;
  const shopName = supplier?.shopLabel
    || supplier?.storeLabel
    || supplier?.label
    || supplier?.name
    || supplier?.companyName
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
      {error && <section className="supplier-shop-card auth-error">{error}</section>}

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
