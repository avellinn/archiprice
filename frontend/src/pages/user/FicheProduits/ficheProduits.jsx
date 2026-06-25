import './ficheProduits.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DetailStore from '../../../components/detailstore';
import Icon from '../../../components/Icon';
import ProductDetailSections from '../../../components/ProductDetailSections';
import ProductSheetGallery from '../../../components/ProductSheetGallery';
import { Alert, Button, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { fetchCatalogueProduct } from '../../../services/catalogueProducts';
import { buildSupplierClientNotification, upsertSupplierClientNotification } from '../../../services/clientNotifications';
import { createDemande } from '../../../services/demandes';
import { createProduct } from '../../../services/products';
import { fetchProjects } from '../../../services/projects';
import { getStoredUserLanguage } from '../../../utils/userLanguage';
import { translateWorkspaceText } from '../../../utils/workspaceLanguage';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}


function normalizeComparableValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getSupplierDisplayName(supplier) {
  return supplier?.companyName || supplier?.name || supplier?.shopName || 'Boutique sans nom';
}

function buildProductShop(product) {
  const shopName = product?.supplierName || product?.shop || product?.supplier;
  if (!shopName && !product?.supplierId) return null;

  return {
    id: product?.supplierId || shopName,
    name: shopName,
    companyName: shopName,
    contact: product?.supplierContact || '',
    email: product?.supplierContact || '',
    phone: product?.supplierPhone || '',
    city: product?.city || '',
    neighborhood: product?.neighborhood || '',
    region: [product?.city, product?.neighborhood].filter(Boolean).join(', '),
    category: product?.category || '',
    categories: [product?.category].filter(Boolean),
    status: product?.supplierStatus || 'Actif',
    isRecommended: true,
  };
}

function buildContactShops(product, suppliers = []) {
  const productShop = buildProductShop(product);
  const productSupplierId = normalizeComparableValue(product?.supplierId);
  const productSupplierName = normalizeComparableValue(product?.supplierName || product?.shop || product?.supplier);

  const matchingSuppliers = suppliers.filter((supplier) => {
    const supplierIds = [supplier.id, supplier._id, supplier.supplierId].map(normalizeComparableValue);
    const supplierNames = [
      supplier.companyName,
      supplier.name,
      supplier.shopName,
      supplier.email,
    ].map(normalizeComparableValue);

    return (
      (productSupplierId && supplierIds.includes(productSupplierId))
      || (productSupplierName && supplierNames.includes(productSupplierName))
    );
  });

  const recommendedSuppliers = suppliers.filter((supplier) => supplier.isRecommended);
  const shopsByKey = new Map();

  [...matchingSuppliers, productShop, ...recommendedSuppliers]
    .filter(Boolean)
    .forEach((shop) => {
      const key = normalizeComparableValue(shop.id || shop._id || getSupplierDisplayName(shop));
      if (!key || shopsByKey.has(key)) return;
      shopsByKey.set(key, {
        ...shop,
        name: getSupplierDisplayName(shop),
        companyName: getSupplierDisplayName(shop),
        isRecommended: true,
      });
    });

  return [...shopsByKey.values()];
}

function buildCatalogueReturnPath(activeProjectId, from) {
  const fromPathname = from?.pathname === '/catalogue' ? from.pathname : '/catalogue';
  const params = new URLSearchParams(from?.pathname === '/catalogue' ? from.search || '' : '');
  params.delete('recap');

  if (activeProjectId && !params.get('projectId')) {
    params.set('projectId', activeProjectId);
  }

  const query = params.toString();
  return `${fromPathname}${query ? `?${query}` : ''}`;
}

function getShopDemandMessage({ shop, product }) {
  const shopName = shop?.name || shop?.companyName || 'cette boutique';
  const productName = product?.name || 'cet article';

  return `Demande boutique pour ${productName} chez ${shopName}.`;
}

export default function FicheProduits() {
  const { user } = useAuth();
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [adminData, updateAdminData] = useAdminData();
  const [product, setProduct] = useState(null);
  const [language, setLanguage] = useState(getStoredUserLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isShopDetailOpen, setIsShopDetailOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeProject, setActiveProject] = useState(location.state?.project || null);

  const loadProduct = useCallback(({ silent = false, force = false } = {}) => {
    let cancelled = false;

    if (!silent) setIsLoading(true);

    fetchCatalogueProduct(productId, { force })
      .then((item) => {
        if (cancelled) return;
        setProduct(item || location.state?.product || null);
        setError('');
      })
      .catch((apiError) => {
        if (cancelled) return;
        if (location.state?.product) {
          setProduct(location.state.product);
          setError('');
          return;
        }
        setError(getApiErrorMessage(apiError, 'Impossible de charger la fiche produit.'));
      })
      .finally(() => {
        if (!cancelled && !silent) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location.state, productId]);

  useEffect(() => {
    const timer = window.setTimeout(loadProduct, 0);
    return () => window.clearTimeout(timer);
  }, [loadProduct]);

  useRealtimeRefresh(
    () => loadProduct({ silent: true, force: true }),
    ['admin-products', 'supplier-products', 'suppliers', 'catalogue-config'],
  );

  useEffect(() => {
    const syncLanguage = () => setLanguage(getStoredUserLanguage());
    window.addEventListener('archiprice:user-profile-change', syncLanguage);
    window.addEventListener('storage', syncLanguage);
    return () => {
      window.removeEventListener('archiprice:user-profile-change', syncLanguage);
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);
  const text = (value) => translateWorkspaceText(value, language);
  const activeProjectId = searchParams.get('projectId') || '';
  const previousLocation = location.state?.from || null;
  const cameFromEspacePro = String(previousLocation?.pathname || '').startsWith('/espacepro');
  const isSelectedFromCatalogue = Boolean(location.state?.isSelected);
  const contactShops = useMemo(
    () => buildContactShops(product, adminData.suppliers || []),
    [adminData.suppliers, product],
  );
  const selectedContactShop = contactShops[0] || null;

  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      return undefined;
    }

    let cancelled = false;
    fetchProjects()
      .then((projects) => {
        if (cancelled) return;
        setActiveProject(projects.find((project) => project.id === activeProjectId) || location.state?.project || null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, location.state?.project]);

  async function handleAddProduct() {
    if (!activeProjectId) {
      navigate('/catalogue', {
        state: {
          selectedProductId: product.id || productId,
          skipProjectGate: true,
        },
      });
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      await createProduct(activeProjectId, {
        name: product.name,
        description: [
          product.description || '',
          product.supplierName || product.shop ? `Boutique : ${product.supplierName || product.shop}` : '',
          product.range ? `Gamme : ${product.range}` : '',
        ].filter(Boolean).join('\n'),
        category: product.category || '',
        subcategory: product.subcategory || '',
        unit: product.unit || 'u',
        unitPrice: product.unitPrice || product.price || 0,
        priceExcludingTax: product.priceExcludingTax ?? product.unitPrice ?? product.price ?? 0,
        vatRate: product.vatRate ?? 0,
        minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
        images: product.images || (product.image ? [product.image] : []),
        dimensions: product.dimensions || {},
        catalogueProductId: product.id || productId,
      });
      navigate(buildCatalogueReturnPath(activeProjectId, previousLocation), {
        state: { addedProductId: product.id || productId },
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible d'ajouter cet article au projet."));
    } finally {
      setIsAdding(false);
    }
  }

  async function handleShopDemand(shop, message = '') {
    if (!shop) return;
    const demandMessage = message.trim() || getShopDemandMessage({ shop, product });

    const notification = buildSupplierClientNotification({
      shop,
      user,
      project: activeProjectId ? { id: activeProjectId, name: activeProject?.name || product?.projectName || 'Projet catalogue' } : null,
      simulation: {
        total: Number(product?.unitPrice || product?.price || 0),
        totalLabel: formatFCFA(product?.unitPrice || product?.price || 0),
        count: 1,
        categories: [product?.category].filter(Boolean),
      },
      products: [product].filter(Boolean),
      message: demandMessage,
    });

    try {
      const demande = await createDemande({
        supplierId: shop.id || shop._id || '',
        supplierName: shop.name || shop.companyName || '',
        supplierContact: shop.contact || shop.email || '',
        productId: product.id || productId,
        productName: product.name || '',
        projectId: activeProjectId,
        projectName: activeProject?.name || product?.projectName || '',
        message: demandMessage,
      });
      upsertSupplierClientNotification(updateAdminData, {
        ...notification,
        id: demande.id || notification.id,
        sourceNotificationId: demande.id || notification.id,
        messages: demande.messages || notification.messages,
        status: demande.status || notification.status,
        createdAt: demande.createdAt || notification.createdAt,
        updatedAt: demande.updatedAt || notification.updatedAt,
      });
    } catch {
      upsertSupplierClientNotification(updateAdminData, notification);
    }
  }

  if (isLoading) {
    return <Loader className="product-sheet-loader" label={text('Chargement de la fiche produit...')} />;
  }

  if (error || !product) {
    return (
      <main className="product-sheet-page">
        <Alert variant="danger">{error || text('Article introuvable.')}</Alert>
        <Button type="button" variant="outline" icon={<Icon name="ArrowLeft" size="sm" />} onClick={() => navigate(buildCatalogueReturnPath(activeProjectId, previousLocation), { state: { skipRecap: true, catalogueSnapshot: location.state?.catalogueSnapshot } })}>
          {text('Retour')}
        </Button>
      </main>
    );
  }

  return (
    <main className="product-sheet-page">
      <button type="button" className="product-sheet-back" onClick={() => navigate(buildCatalogueReturnPath(activeProjectId, previousLocation), { state: { skipRecap: true, catalogueSnapshot: location.state?.catalogueSnapshot } })} aria-label={text('Retour')}>
        <Icon name="ArrowLeft" size="sm" />
      </button>

      <section className="product-sheet-layout">
        <ProductSheetGallery key={product.id || productId} product={product} language={language} />

        <article className="product-sheet-content">




          <ProductDetailSections product={product} language={language} />

          <footer className="product-sheet-content-footer">
            <div className="product-sheet-actions">
              <Button type="button" size="sm" onClick={() => setIsShopDetailOpen(true)}>{text('Contactez la société')}</Button>
            </div>
            {!cameFromEspacePro && !isSelectedFromCatalogue && (
              <Button
                type="button"
                size="sm"
                icon={<Icon name="Add" size="sm" />}
                isLoading={isAdding}
                onClick={handleAddProduct}
              >
                {text('Ajouter')}
              </Button>
            )}
          </footer>
        </article>
      </section>

      <DetailStore
        isOpen={isShopDetailOpen}
        shop={selectedContactShop}
        onClose={() => setIsShopDetailOpen(false)}
        onSelectShop={handleShopDemand}
      />
    </main>
  );
}
