import './Produits.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProduitAjouteSup from '../../../components/ProduitAjouteSup';
import { Button, Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { createAdminId, useAdminData } from '../../../services/adminData';
import {
  deleteSupplierProduct,
  fetchSupplierProducts,
  fetchSupplierProfile,
  subscribeSupplierWorkspaceChange,
} from '../../../services/supplier';

function getProductImage(product) {
  const image = Array.isArray(product.images) ? product.images[0] : product.image;

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

export default function Produits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [adminData, setAdminData] = useAdminData();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProductId, setDeletingProductId] = useState('');
  const [supplierProfile, setSupplierProfile] = useState(null);
  const shopName = supplierProfile?.companyName
    || supplierProfile?.shopLabel
    || supplierProfile?.storeLabel
    || supplierProfile?.label
    || supplierProfile?.name
    || user?.companyName
    || user?.shopName
    || user?.name
    || user?.email
    || '';

  function loadProducts() {
    let cancelled = false;

    Promise.allSettled([
      fetchSupplierProducts(),
      fetchSupplierProfile(),
    ])
      .then(([productsResult, profileResult]) => {
        if (cancelled) return;

        if (productsResult.status === 'fulfilled') {
          setProducts(productsResult.value || []);
          setError('');
        } else {
          setProducts([]);
          setError(getApiErrorMessage(productsResult.reason, 'Impossible de charger les produits.'));
        }

        if (profileResult.status === 'fulfilled') {
          setSupplierProfile(profileResult.value || null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }

  useEffect(() => {
    const cancelLoad = loadProducts();
    const unsubscribe = subscribeSupplierWorkspaceChange(() => {
      loadProducts();
    });

    return () => {
      cancelLoad();
      unsubscribe();
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
  const adminProductsBySupplierSource = useMemo(() => {
    const entries = (adminData.products || [])
      .filter((product) => product.sourceSupplierProductId)
      .map((product) => [product.sourceSupplierProductId, product]);

    return new Map(entries);
  }, [adminData.products]);

  function publishProduct(product) {
    setAdminData((currentData) => {
      const existingProduct = (currentData.products || []).find((item) => item.sourceSupplierProductId === product.id);
      const image = getProductImage(product);
      const proposal = {
        ...(existingProduct || {}),
        id: existingProduct?.id || createAdminId('supplier-product'),
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
        supplier: product.supplierName || product.supplierLabel || product.supplier || shopName,
        vat: '20%',
        visual: 'sofa',
        city: product.city || '',
        neighborhood: product.neighborhood || '',
        availability: product.availability || '',
        publicationStatus: 'En attente',
        publicationSource: 'supplier',
        submittedAt: existingProduct?.submittedAt || new Date().toISOString(),
      };

      return {
        ...currentData,
        products: existingProduct
          ? currentData.products.map((item) => (item.id === existingProduct.id ? proposal : item))
          : [proposal, ...(currentData.products || [])],
      };
    });
  }

  function withdrawProduct(product) {
    const publishedProduct = adminProductsBySupplierSource.get(product.id);
    if (!publishedProduct) return;

    setAdminData((currentData) => ({
      ...currentData,
      products: (currentData.products || []).filter((item) => item.id !== publishedProduct.id),
    }));
  }

  async function removeProduct(productId) {
    setDeletingProductId(productId);
    setError('');

    try {
      await deleteSupplierProduct(productId);
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
      setAdminData((currentData) => ({
        ...currentData,
        products: (currentData.products || []).filter((product) => product.sourceSupplierProductId !== productId),
      }));
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
