import './Catalogue.css';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import CardArticle, { ArticleFullscreen } from '../../../components/cardarticle';
import Newproject from '../../../components/Newproject';
import Recap from '../../../components/recap';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { addExportedDocument } from '../../../services/exportedDocuments';
import { createProduct, fetchProducts } from '../../../services/products';
import { createProject, fetchProjects, updateProject } from '../../../services/projects';
import Filterpanel from '../../../components/Filterpanel';
import SimulBudget from '../../../components/simulBudget';

const VISUAL_TONES = {
  sofa: 'linen',
  table: 'wood',
  lamp: 'amber',
  tile: 'stone',
  paint: 'sage',
  chair: 'night',
  shelf: 'wood',
  'wall-light': 'amber',
};

function parsePrice(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function formatCurrency(value) {
  return formatFCFA(value);
}

function formatOptionalCurrency(value) {
  return value > 0 ? formatFCFA(value) : 'À définir';
}

function normalizeBudgetInput(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function formatBudgetInputValue(value) {
  const amount = parsePrice(value);
  return amount > 0 ? formatFCFA(amount) : '';
}

function getCoefficient(city, regionalCoefficients) {
  const item = regionalCoefficients.find((coefficient) => coefficient.city === city);
  const value = Number(String(item?.coefficient || '1').replace(',', '.'));

  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;

  return image.secure_url || image.url || '';
}

function buildCatalogueProduct(product, adminData) {
  const settings = adminData.settings;
  const basePrice = parsePrice(product.price);
  const margin = Number(settings.margin || 0) / 100;
  const vat = Number(settings.vat || 0) / 100;
  const regionalCoefficient = getCoefficient(product.city, adminData.regionalCoefficients);
  const minPrice = Math.round(basePrice * regionalCoefficient);
  const maxPrice = Math.round(basePrice * (1 + margin) * (1 + vat) * regionalCoefficient);
  const supplier = adminData.suppliers.find((item) => item.name === product.supplier);
  const locationLabel = [product.city, product.neighborhood].filter(Boolean).join(' · ');
  const imageDocuments = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : [];
  const images = imageDocuments.length > 0
    ? imageDocuments.map(getImageUrl).filter(Boolean)
    : [product.image].filter(Boolean);
  const primaryImage = images[0] || '';

  return {
    ...product,
    minPrice,
    maxPrice,
    shop: supplier?.name || product.supplier,
    shopZone: locationLabel || supplier?.region || product.city,
    tone: VISUAL_TONES[product.visual] || 'linen',
    image: primaryImage,
    images,
    imageDocuments,
  };
}

function isSupplierVisibleForCatalogue(product, adminData) {
  const supplier = (adminData.suppliers || []).find((item) => (
    item.name === product.supplier
    || item.companyName === product.supplier
    || item.email === product.supplier
  ));

  if (!supplier) return true;
  return !['Bloqué', 'Supprimé'].includes(supplier.status);
}

function buildProjectDescription({ selectedProducts, budgetTarget, budgetSummary }) {
  const rooms = [...new Set(selectedProducts.map((product) => product.room))].join(', ');
  const shops = [...new Set(selectedProducts.map((product) => product.shop))].join(', ');
  const productList = selectedProducts.map((product) => `- ${product.name} (${product.shop})`).join('\n');

  return [
    `Type de pièce : ${rooms || 'Non renseigné'}`,
    `Estimation budget : ${budgetTarget ? formatFCFA(budgetTarget) : 'Non renseigné'}`,
    `Estimation min : ${formatFCFA(budgetSummary.min)}`,
    `Estimation max : ${formatFCFA(budgetSummary.max)}`,
    `Boutiques : ${shops || 'Non renseigné'}`,
    'Articles sélectionnés :',
    productList,
  ].join('\n');
}

function getGeneratedProjectName() {
  return `Projet catalogue ${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())}`;
}

function extractProjectBudget(project) {
  const budgetMatch = (project?.description || '').match(/Estimation budget\s*:\s*([^\n]+)/i);
  const budget = Number(String(budgetMatch?.[1] || '').replace(/[^\d.-]/g, ''));

  return Number.isFinite(budget) && budget > 0 ? budget : null;
}

function isPublishedCatalogueProduct(product) {
  return !product.publicationStatus || product.publicationStatus === 'Validé';
}

export default function Catalogue() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [adminData] = useAdminData();
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedRoom, setSelectedRoom] = useState('Toutes');
  const [selectedRange, setSelectedRange] = useState('Toutes');
  const [selectedCity, setSelectedCity] = useState('Toutes');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Tous');
  const [budgetTarget, setBudgetTarget] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [fullscreenProductId, setFullscreenProductId] = useState('');
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);
  const [isRecapVisible, setIsRecapVisible] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const activeProjectId = searchParams.get('projectId') || '';

  useEffect(() => {
    const projectIdFromUrl = activeProjectId;
    if (!projectIdFromUrl) return undefined;

    let cancelled = false;

    fetchProjects()
      .then((projects) => {
        if (cancelled) return;

        const currentProject = projects.find((project) => project.id === projectIdFromUrl);
        const projectBudget = extractProjectBudget(currentProject);

        if (projectBudget) {
          setBudgetTarget(String(projectBudget));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const products = useMemo(() => (
    (Array.isArray(adminData.products) ? adminData.products : [])
      .filter(isPublishedCatalogueProduct)
      .filter((product) => isSupplierVisibleForCatalogue(product, adminData))
      .map((product) => buildCatalogueProduct(product, adminData))
  ), [adminData]);

  useEffect(() => {
    if (!activeProjectId || searchParams.get('recap') !== '1' || products.length === 0) return undefined;

    let cancelled = false;

    fetchProducts(activeProjectId)
      .then((projectProducts) => {
        if (cancelled) return;

        const selectedIds = products
          .filter((catalogueProduct) => projectProducts.some((projectProduct) => (
            String(projectProduct.name || '').trim().toLowerCase() === String(catalogueProduct.name || '').trim().toLowerCase()
            && (
              !projectProduct.category
              || String(projectProduct.category || '').trim().toLowerCase() === String(catalogueProduct.category || '').trim().toLowerCase()
            )
          )))
          .map((product) => product.id);

        if (selectedIds.length > 0) {
          setSelectedProductIds(selectedIds);
          setValidationError('');
          setIsRecapVisible(true);
        } else {
          setValidationError('Aucun article du projet ne correspond au catalogue actuel.');
        }
      })
      .catch((error) => {
        if (!cancelled) setValidationError(getApiErrorMessage(error, 'Impossible de charger les articles du projet.'));
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, products, searchParams]);

  const filters = useMemo(() => ({
    categories: ['Tout', ...adminData.taxonomies.categories.map((category) => category.name)],
    rooms: ['Toutes', ...adminData.taxonomies.rooms.map((room) => room.name)],
    ranges: ['Toutes', ...adminData.taxonomies.ranges.map((range) => range.name)],
    cities: [
      'Toutes',
      ...new Set([
        ...(adminData.taxonomies.cities || []).map((city) => city.name),
        ...(Array.isArray(adminData.products) ? adminData.products : [])
          .filter(isPublishedCatalogueProduct)
          .filter((product) => isSupplierVisibleForCatalogue(product, adminData))
          .map((product) => product.city)
          .filter(Boolean),
      ]),
    ],
    neighborhoods: [
      'Tous',
      ...new Set([
        ...(adminData.taxonomies.neighborhoods || []).map((neighborhood) => neighborhood.name),
        ...(Array.isArray(adminData.products) ? adminData.products : [])
          .filter(isPublishedCatalogueProduct)
          .filter((product) => isSupplierVisibleForCatalogue(product, adminData))
          .map((product) => product.neighborhood)
          .filter(Boolean),
      ]),
    ],
  }), [adminData]);
  const roomOptions = useMemo(() => (
    (adminData.taxonomies?.rooms || [])
      .map((room) => room?.name || room?.label || room)
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }))
  ), [adminData.taxonomies.rooms]);

  const activeCategory = filters.categories.includes(selectedCategory) ? selectedCategory : 'Tout';
  const activeRoom = filters.rooms.includes(selectedRoom) ? selectedRoom : 'Toutes';
  const activeRange = filters.ranges.includes(selectedRange) ? selectedRange : 'Toutes';
  const activeCity = filters.cities.includes(selectedCity) ? selectedCity : 'Toutes';
  const activeNeighborhood = filters.neighborhoods.includes(selectedNeighborhood) ? selectedNeighborhood : 'Tous';

  const catalogueSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const filteredProducts = useMemo(
    () => products.filter((product) => {
      const matchesFilters = (
        (activeCategory === 'Tout' || product.category === activeCategory)
        && (activeRoom === 'Toutes' || product.room === activeRoom)
        && (activeRange === 'Toutes' || product.range === activeRange)
        && (activeCity === 'Toutes' || product.city === activeCity)
        && (activeNeighborhood === 'Tous' || product.neighborhood === activeNeighborhood)
      );
      const matchesSearch = !catalogueSearchTerm
        || [product.name, product.category, product.room, product.range, product.shop, product.shopZone, product.city, product.neighborhood]
          .some((value) => String(value || '').toLowerCase().includes(catalogueSearchTerm));

      return matchesFilters && matchesSearch;
    }),
    [activeCategory, activeCity, activeNeighborhood, activeRange, activeRoom, catalogueSearchTerm, products],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const budgetSummary = useMemo(() => {
    const min = selectedProducts.reduce((total, product) => total + product.minPrice, 0);
    const max = selectedProducts.reduce((total, product) => total + product.maxPrice, 0);
    const target = parsePrice(budgetTarget);
    const hasTarget = target > 0;
    const overage = hasTarget ? Math.max(max - target, 0) : 0;

    return { min, max, overage, target, hasTarget };
  }, [budgetTarget, selectedProducts]);
  const generatedAt = useMemo(
    () => new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
    [],
  );
  const fullscreenProduct = products.find((product) => product.id === fullscreenProductId);
  const fullscreenImage = fullscreenProduct?.images?.[fullscreenImageIndex] || fullscreenProduct?.image || '';
  const hasCatalogueProducts = products.length > 0;
  const hasCatalogueFilters = Object.values(adminData?.taxonomies || {}).some((items) => (
    Array.isArray(items) && items.length > 0
  ));
  const shouldShowFilterPanel = hasCatalogueProducts && hasCatalogueFilters;

  function toggleProduct(productId) {
    setValidationError('');
    setIsRecapVisible(false);
    const nextIds = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];

    setSelectedProductIds(nextIds);
  }

  function openFullscreenProduct(productId) {
    setFullscreenProductId(productId);
    setFullscreenImageIndex(0);
  }

  function handleModifyPurchase() {
    setIsRecapVisible(false);
    setValidationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/catalogue${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, { replace: true });
  }

  function handleBudgetValidation() {
    if (selectedProducts.length === 0) return;
    if (!budgetSummary.hasTarget) {
      setValidationError('Renseignez un budget cible avant de valider la simulation.');
      return;
    }

    setValidationError('');
    setIsRecapVisible(true);
  }

  function handleWorkspaceReturn() {
    const from = location.state?.from;

    if (from?.pathname && from.pathname !== location.pathname) {
      navigate(`${from.pathname}${from.search || ''}${from.hash || ''}`);
      return;
    }

    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    const projectIdFromUrl = searchParams.get('projectId');
    navigate(projectIdFromUrl ? `/workspace?mode=projects&projectId=${projectIdFromUrl}` : '/workspace');
  }

  function handleGateCancel() {
    navigate('/workspace', { replace: true });
  }

  function handleProjectGateCreated(project) {
    if (!project?.id) return;

    const projectBudget = extractProjectBudget(project);
    if (projectBudget) setBudgetTarget(String(projectBudget));

    navigate(`/catalogue?projectId=${project.id}`, {
      replace: true,
      state: { from: location.state?.from || { pathname: '/workspace', search: '' } },
    });
  }

  async function handleConfirmValidation() {
    if (selectedProducts.length === 0) return;
    if (!budgetSummary.hasTarget) {
      setValidationError('Renseignez un budget cible avant de confirmer la validation.');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const projectIdFromUrl = activeProjectId;
      const description = buildProjectDescription({
        selectedProducts,
        budgetTarget: budgetSummary.target,
        budgetSummary,
      });
      const project = projectIdFromUrl
        ? await updateProject(projectIdFromUrl, {
          description,
          status: 'active',
        })
        : await createProject({
          name: getGeneratedProjectName(),
          description,
          status: 'active',
        });

      await Promise.all(selectedProducts.map((product) => createProduct(project.id, {
        name: product.name,
        description: [
          `Boutique : ${product.shop}`,
          `Gamme : ${product.range}`,
          `Prix min : ${product.minPrice}`,
          `Prix max : ${product.maxPrice}`,
        ].join('\n'),
        category: product.category,
        unit: 'u',
        unitPrice: product.maxPrice,
        images: product.imageDocuments || [],
      })));

      addExportedDocument({
        projectId: project.id,
        projectName: project.name,
        userName: user?.name || user?.fullName || user?.email || 'Utilisateur ArchiPrice',
        userEmail: user?.email || '',
        reference: `SIM-${project.id}`,
        amount: budgetSummary.max,
        itemCount: selectedProducts.length,
        status: 'Succès',
        city: [...new Set(selectedProducts.map((product) => product.city).filter(Boolean))].join(', ') || project.name,
        coefficient: '1,00',
        items: selectedProducts.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          quantity: 1,
          price: formatFCFA(product.maxPrice),
          total: formatFCFA(product.maxPrice),
          rawPrice: product.maxPrice,
          imageUrl: product.image,
          images: (product.imageDocuments || []).length > 0
            ? product.imageDocuments
            : (product.images || []).map((image) => ({ secure_url: image, name: product.name })),
        })),
      });

      navigate(`/workspace?mode=projects&projectId=${project.id}`, { replace: true });
    } catch (error) {
      setValidationError(getApiErrorMessage(error, 'Impossible de confirmer la validation'));
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <div
      className={[
        'catalogue-page',
        'catalogue-page--products',
        hasCatalogueProducts ? '' : 'catalogue-page--empty',
        shouldShowFilterPanel ? 'catalogue-page--with-filters' : 'catalogue-page--without-filters',
        activeProjectId ? 'catalogue-page--with-budget' : 'catalogue-page--without-budget',
      ].filter(Boolean).join(' ')}
    >
      {shouldShowFilterPanel && (
        <Filterpanel
          filters={filters}
          activeCategory={activeCategory}
          activeRoom={activeRoom}
          activeRange={activeRange}
          activeCity={activeCity}
          activeNeighborhood={activeNeighborhood}
          onCategoryChange={setSelectedCategory}
          onRoomChange={setSelectedRoom}
          onRangeChange={setSelectedRange}
          onCityChange={setSelectedCity}
          onNeighborhoodChange={setSelectedNeighborhood}
          onWorkspaceReturn={handleWorkspaceReturn}
        />
      )}

      <main className="catalogue-product-main">
        <div className="catalogue-product-heading">
          <div>
            <span className="catalogue-eyebrow"> articles</span>
            <h2>{hasCatalogueProducts ? `${filteredProducts.length} articles disponibles` : 'Aucun catalogue ou produits disponible'}</h2>
          </div>

        </div>

        <section className="catalogue-product-grid" aria-label="Articles du catalogue">
          {filteredProducts.length === 0 && (
            <p className="catalogue-empty-state">
              {hasCatalogueProducts
                ? 'Aucun article ne correspond aux filtres actuels.'
                : 'Aucun catalogue ou produits disponible '}
            </p>
          )}

          {filteredProducts.map((product, index) => {
            const isSelected = selectedProductIds.includes(product.id);
            const priceRange = `${formatCurrency(product.minPrice)} - ${formatCurrency(product.maxPrice)}`;

            return (
              <CardArticle
                key={`${product.id || product.name}-${index}`}
                product={product}
                isSelected={isSelected}
                priceRange={priceRange}
                onOpen={openFullscreenProduct}
                onToggle={toggleProduct}
              />
            );
          })}
        </section>
      </main>

      {activeProjectId && (
        <SimulBudget
          budgetTarget={budgetTarget}
          budgetSummary={budgetSummary}
          selectedCount={selectedProducts.length}
          validationError={!isRecapVisible ? validationError : ''}
          formatCurrency={formatCurrency}
          formatBudgetInputValue={formatBudgetInputValue}
          normalizeBudgetInput={normalizeBudgetInput}
          onBudgetChange={setBudgetTarget}
          onValidate={handleBudgetValidation}
        />
      )}

      {selectedProducts.length > 0 && isRecapVisible && (
        <Recap
          selectedProducts={selectedProducts}
          budgetSummary={budgetSummary}
          generatedAt={generatedAt}
          reference={activeProjectId || 'ARCHI-CATALOGUE'}
          validationError={validationError}
          isValidating={isValidating}
          formatCurrency={formatCurrency}
          formatOptionalCurrency={formatOptionalCurrency}
          onClose={() => setIsRecapVisible(false)}
          onModify={handleModifyPurchase}
          onConfirm={handleConfirmValidation}
        />
      )}

      <Newproject
        isOpen={!activeProjectId}
        onCancel={handleGateCancel}
        onCreated={handleProjectGateCreated}
        roomTypes={roomOptions}
      />

      {fullscreenProduct && (
        <ArticleFullscreen
          product={fullscreenProduct}
          image={fullscreenImage}
          imageIndex={fullscreenImageIndex}
          isSelected={selectedProductIds.includes(fullscreenProduct.id)}
          priceRange={`${formatCurrency(fullscreenProduct.minPrice)} - ${formatCurrency(fullscreenProduct.maxPrice)}`}
          onClose={() => setFullscreenProductId('')}
          onImageSelect={setFullscreenImageIndex}
          onToggle={toggleProduct}
        />
      )}
    </div>
  );
}
