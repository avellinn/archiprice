import './Produits.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProduitAjouteSup from '../../../components/ProduitAjouteSup';
import { Button, Icon } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { useAdminData } from '../../../services/adminData';
import {
  deleteSupplierProduct,
  fetchSupplierProducts,
  subscribeSupplierWorkspaceChange,
  updateSupplierProductPublication,
} from '../../../services/supplier';

export default function Produits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, setAdminData] = useAdminData();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProductId, setDeletingProductId] = useState('');

  const loadProducts = useCallback(() => {
    fetchSupplierProducts()
      .then((items) => {
        setProducts(items || []);
        setError('');
      })
      .catch((apiError) => {
        setProducts([]);
        setError(getApiErrorMessage(apiError, 'Impossible de charger les produits.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
    const unsubscribe = subscribeSupplierWorkspaceChange(loadProducts);
    return unsubscribe;
  }, [loadProducts]);

  useRealtimeRefresh(loadProducts, ['supplier-products', 'admin-products']);

  const query = searchParams.get('q')?.trim().toLowerCase() || '';
  const filteredProducts = useMemo(() => (
    products.filter((product) => (
      !query
      || String(product.name || '').toLowerCase().includes(query)
      || String(product.category || '').toLowerCase().includes(query)
    ))
  ), [products, query]);
  const adminProductsBySupplierSource = useMemo(() => (
    new Map(products.map((product) => [product.id, {
      publicationStatus: product.publicationStatus || 'Brouillon',
    }]))
  ), [products]);

  async function publishProduct(product) {
    try {
      const updatedProduct = await updateSupplierProductPublication(product.id, 'En attente');
      setProducts((currentProducts) => currentProducts.map((item) => (
        item.id === product.id ? updatedProduct : item
      )));
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de publier le produit.'));
    }
  }

  async function withdrawProduct(product) {
    try {
      const updatedProduct = await updateSupplierProductPublication(product.id, 'Retiré');
      setProducts((currentProducts) => currentProducts.map((item) => (
        item.id === product.id ? updatedProduct : item
      )));
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de retirer le produit.'));
    }
  }

  async function removeProduct(productId) {
    setDeletingProductId(productId);
    setError('');

    try {
      await deleteSupplierProduct(productId);
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
      setAdminData((currentData) => ({ ...currentData, products: [] }));
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

      <ProduitAjouteSup
        products={filteredProducts}
        adminProductsBySupplierSource={adminProductsBySupplierSource}
        deletingProductId={deletingProductId}
        error={error}
        isLoading={isLoading}
        onDelete={removeProduct}
        onEdit={(product) => navigate(`/supplier/products/new?edit=${product.id}`)}
        onPublish={publishProduct}
        onWithdraw={withdrawProduct}
      />
    </div>
  );
}
