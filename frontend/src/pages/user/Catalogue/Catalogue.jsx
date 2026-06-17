import './Catalogue.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import Newproject from '../../../components/Newproject';
import Recap from '../../../components/recap';
import { Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { fetchCatalogueProducts } from '../../../services/catalogueProducts';
import { addExportedDocument } from '../../../services/exportedDocuments';
import { createProduct, fetchProducts } from '../../../services/products';
import { createProject, fetchProjects, updateProject } from '../../../services/projects';
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

/* ── Utilitaires ── */

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
  const basePrice = parsePrice(product.price ?? product.unitPrice);
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
    shop: supplier?.name || product.supplier || product.supplierName || product.shop,
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

const FILTER_COLLAPSE_MS = 60_000;
const BUDGET_INACTIVITY_MS = 5 * 60_000;

/* ── Bouton discret flottant ── */

function CatalogueDiscreteButton({
  position,
  label,
  iconName,
  onClick,
}) {
  return (
    <button
      type="button"
      className={['catalogue-discrete-btn', `catalogue-discrete-btn--${position}`].join(' ')}
      onClick={onClick}
      aria-label={label}
    >
      <span className="catalogue-discrete-btn__icon" aria-hidden="true">
        <Icon name={iconName} size="sm" />
      </span>
      <span className="catalogue-discrete-btn__label">{label}</span>
    </button>
  );
}

/* ── Filterpanel (inline) ── */

function FilterGroup({ title, options, activeValue, onSelect }) {
  return (
    <section className="catalogue-filter-group">
      <h2>{title}</h2>
      <div>
        {options.map((option, index) => (
          <button
            type="button"
            className={activeValue === option ? 'is-active' : ''}
            key={`${option}-${index}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

function Filterpanel({
  filters,
  activeCategory,
  activeRoom,
  activeRange,
  activeCity,
  activeNeighborhood,
  onCategoryChange,
  onRoomChange,
  onRangeChange,
  onCityChange,
  onNeighborhoodChange,
  onWorkspaceReturn,
  onInteract,
  onMinimize,
}) {
  function handleSelect(onSelect) {
    return (value) => {
      onInteract?.();
      onSelect(value);
    };
  }

  return (
    <aside className="catalogue-filter-panel catalogue-filter-panel--expanded" aria-label="Filtres du catalogue">
      <div className="catalogue-filter-panel__header">
        <div>
          <button
            type="button"
            className="catalogue-workspace-return"
            onClick={onWorkspaceReturn}
          >
            <Icon name="ArrowLeft" size="sm" />
          </button>
          <span className="catalogue-eyebrow" />
          <h1>Filtres</h1>
        </div>
        <button
          type="button"
          className="catalogue-panel-minimize"
          aria-label="Réduire les filtres"
          onClick={onMinimize}
        >
          <Icon name="ChevronLeft" size="sm" />
        </button>
      </div>

      <FilterGroup title="Catégorie" options={filters.categories} activeValue={activeCategory} onSelect={handleSelect(onCategoryChange)} />
      <FilterGroup title="Pièce" options={filters.rooms} activeValue={activeRoom} onSelect={handleSelect(onRoomChange)} />
      <FilterGroup title="Gamme" options={filters.ranges} activeValue={activeRange} onSelect={handleSelect(onRangeChange)} />
      <FilterGroup title="Ville" options={filters.cities} activeValue={activeCity} onSelect={handleSelect(onCityChange)} />
      <FilterGroup title="Quartier" options={filters.neighborhoods} activeValue={activeNeighborhood} onSelect={handleSelect(onNeighborhoodChange)} />
    </aside>
  );
}

/* ── Catégories (inline) ── */

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildProductCategories(products = []) {
  const fallbackImages = products.map((product) => {
    const images = Array.isArray(product?.images) ? product.images : [];
    const firstImage = images[0] || product?.image;
    if (!firstImage) return '';
    if (typeof firstImage === 'string') return firstImage;
    return firstImage.secure_url || firstImage.url || '';
  }).filter(Boolean);

  const categoryMap = new Map();

  products.forEach((product) => {
    const label = String(product.category || '').trim();
    if (!label) return;

    const id = slugify(label);
    const images = Array.isArray(product.images) ? product.images : [];
    const firstImage = images[0] || product.image;
    const image = typeof firstImage === 'string'
      ? firstImage
      : (firstImage?.secure_url || firstImage?.url || '');
    const current = categoryMap.get(id);

    if (!current) {
      categoryMap.set(id, {
        id,
        label,
        value: label,
        image: image || fallbackImages[0] || '',
      });
      return;
    }

    if (!current.image && image) {
      categoryMap.set(id, { ...current, image });
    }
  });

  return [...categoryMap.values()];
}

function CatalogueCategories({ products = [], activeCategory = '', onSelect }) {
  const scrollRef = useRef(null);
  const isPausedRef = useRef(false);
  const categories = useMemo(() => buildProductCategories(products), [products]);
  const carouselCategories = useMemo(
    () => (categories.length > 1 ? [...categories, ...categories] : categories),
    [categories],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || categories.length <= 1) return undefined;

    let animationId = 0;

    function tick() {
      if (!isPausedRef.current && container) {
        container.scrollLeft += 0.45;
        const loopWidth = container.scrollWidth / 2;
        if (loopWidth > 0 && container.scrollLeft >= loopWidth) {
          container.scrollLeft -= loopWidth;
        }
      }
      animationId = window.requestAnimationFrame(tick);
    }

    animationId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationId);
  }, [categories.length]);

  function scrollBy(delta) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function handleSelect(category) {
    const value = category?.value || category?.label || '';
    if (activeCategory === value) {
      onSelect?.({ value: 'Tout', label: 'Tout' });
      return;
    }
    onSelect?.(category);
  }

  if (categories.length === 0) return null;

  return (
    <section
      className="catalogue-categories catalogue-categories--carousel"
      aria-label="Catégories"
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
    >
      {categories.length > 4 && (
        <button type="button" className="catalogue-categories__arrow catalogue-categories__arrow--left" onClick={() => scrollBy(-240)} aria-label="Défiler les catégories vers la gauche">
          <Icon name="ArrowLeft" size="sm" />
        </button>
      )}
      <div className="catalogue-categories__scroll" ref={scrollRef}>
        {carouselCategories.map((category, index) => (
          <button
            type="button"
            key={`${category.id}-${index}`}
            className={[
              'catalogue-categories__item',
              activeCategory === category.value || activeCategory === category.label ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleSelect(category)}
          >
            <span
              className={[
                'catalogue-categories__thumb',
                category.image ? 'catalogue-categories__thumb--has-image' : '',
              ].filter(Boolean).join(' ')}
              aria-hidden="true"
            >
              {category.image ? (
                <img src={category.image} alt="" loading="lazy" />
              ) : null}
            </span>
            <span className="catalogue-categories__label">{category.label}</span>
          </button>
        ))}
      </div>
      {categories.length > 4 && (
        <button type="button" className="catalogue-categories__arrow catalogue-categories__arrow--right" onClick={() => scrollBy(240)} aria-label="Défiler les catégories vers la droite">
          <Icon name="ArrowRight" size="sm" />
        </button>
      )}
    </section>
  );
}

/* ── CardArticle (inline) ── */

function ArticleImage({ image, tone, label, className = '', children }) {
  return (
    <div
      className={[
        'catalogue-product-photo',
        `catalogue-product-photo--${tone}`,
        image ? 'has-image' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {image && <img src={image} alt="" loading="lazy" />}
      <span>{label}</span>
      {children}
    </div>
  );
}

function CardArticle({
  product,
  isSelected,
  priceRange,
  onOpen,
  onToggle,
}) {
  const images = Array.isArray(product.images) ? product.images : [];

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(product.id);
    }
  }

  return (
    <article
      className={['catalogue-product-card', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={handleKeyDown}
    >
      <ArticleImage image={product.image} tone={product.tone} label={product.category}>
        {images.length > 1 && (
          <small className="catalogue-product-photo__count">
            {images.length} images
          </small>
        )}
      </ArticleImage>

      <div className="catalogue-product-card__body">
        <div>
          <h3>{product.name}</h3>
          <p>{product.shop} · {product.shopZone}</p>
        </div>
        <strong>{priceRange}</strong>
        <button
          type="button"
          className={['catalogue-product-card__add', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(product.id);
          }}
        >
          <Icon name={isSelected ? 'Check' : 'Add'} size="sm" />
          {isSelected ? 'Ajouté' : 'Ajouter'}
        </button>
      </div>
    </article>
  );
}

function ThumbGrid({ product, activeIndex, onSelect }) {
  const images = Array.isArray(product.images) ? product.images : [];
  if (images.length <= 1) return null;

  return (
    <div className="catalogue-fullscreen__thumbs" aria-label="Images de l'article">
      {images.map((image, index) => (
        <button
          type="button"
          className={index === activeIndex ? 'is-active' : ''}
          key={`${image.slice(0, 28)}-${index}`}
          onClick={() => onSelect(index)}
          aria-label={`Afficher l'image ${index + 1}`}
        >
          <img src={image} alt="" />
        </button>
      ))}
    </div>
  );
}

function ArticleFullscreen({
  product,
  image,
  imageIndex,
  isSelected,
  priceRange,
  onClose,
  onImageSelect,
  onToggle,
}) {
  const images = Array.isArray(product.images) ? product.images : [];

  return (
    <div className="catalogue-fullscreen" role="dialog" aria-modal="true" aria-label={product.name}>
      <button
        type="button"
        className="catalogue-fullscreen__close"
        aria-label="Fermer le mode plein écran"
        onClick={onClose}
      >
        <Icon name="Close" />
      </button>

      <article className="catalogue-fullscreen__card">
        <div className="catalogue-fullscreen__media">
          <ArticleImage
            image={image}
            tone={product.tone}
            label={product.category}
            className="catalogue-fullscreen__visual"
          >
            <div className="catalogue-fullscreen__content">
              <span className="catalogue-eyebrow">{product.room} · {product.range}</span>
              <h2>{product.name}</h2>
              <p>{product.shop} · {product.shopZone}</p>
              <strong>{priceRange}</strong>
              <Button
                type="button"
                icon={<Icon name={isSelected ? 'Check' : 'Add'} size="sm" />}
                onClick={() => onToggle(product.id)}
              >
                {isSelected ? 'Retirer du choix' : 'Ajouter au budget'}
              </Button>
            </div>

            {images.length > 1 && (
              <small className="catalogue-product-photo__count">
                {images.length} images
              </small>
            )}
          </ArticleImage>

          <ThumbGrid product={product} activeIndex={imageIndex} onSelect={onImageSelect} />
        </div>
      </article>
    </div>
  );
}

/* ── Page principale ── */

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
  const [catalogueProducts, setCatalogueProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [isBudgetExpanded, setIsBudgetExpanded] = useState(true);
  const pageRef = useRef(null);
  const filterCollapseTimerRef = useRef(null);
  const budgetInactivityTimerRef = useRef(null);
  const activeProjectId = searchParams.get('projectId') || '';

  const loadCatalogueProducts = useCallback(({ silent = false } = {}) => {
    if (!silent) setIsLoadingProducts(true);

    fetchCatalogueProducts()
      .then((items) => {
        setCatalogueProducts(items);
        setProductsError('');
      })
      .catch((error) => {
        setCatalogueProducts([]);
        setProductsError(getApiErrorMessage(error, 'Impossible de charger le catalogue.'));
      })
      .finally(() => {
        if (!silent) setIsLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    loadCatalogueProducts();
  }, [loadCatalogueProducts]);

  useRealtimeRefresh(
    () => loadCatalogueProducts({ silent: true }),
    ['admin-products', 'supplier-products', 'suppliers', 'catalogue-config'],
  );

  useEffect(() => {
    const projectIdFromUrl = activeProjectId;
    if (!projectIdFromUrl) return undefined;

    let cancelled = false;

    fetchProjects()
      .then((projects) => {
        if (cancelled) return;
        const currentProject = projects.find((project) => project.id === projectIdFromUrl);
        const projectBudget = extractProjectBudget(currentProject);
        if (projectBudget) setBudgetTarget(String(projectBudget));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const products = useMemo(() => (
    catalogueProducts
      .filter(isPublishedCatalogueProduct)
      .filter((product) => isSupplierVisibleForCatalogue(product, adminData))
      .map((product) => buildCatalogueProduct(product, adminData))
  ), [adminData, catalogueProducts]);

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
        ...catalogueProducts
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
        ...catalogueProducts
          .filter(isPublishedCatalogueProduct)
          .filter((product) => isSupplierVisibleForCatalogue(product, adminData))
          .map((product) => product.neighborhood)
          .filter(Boolean),
      ]),
    ],
  }), [adminData, catalogueProducts]);

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
  const isFilterVisible = shouldShowFilterPanel && isFilterExpanded;
  const isBudgetVisible = Boolean(activeProjectId) && isBudgetExpanded;

  const resetFilterCollapseTimer = useCallback(() => {
    if (filterCollapseTimerRef.current) {
      window.clearTimeout(filterCollapseTimerRef.current);
    }
    if (!shouldShowFilterPanel || !isFilterExpanded) return;

    filterCollapseTimerRef.current = window.setTimeout(() => {
      setIsFilterExpanded(false);
    }, FILTER_COLLAPSE_MS);
  }, [isFilterExpanded, shouldShowFilterPanel]);

  const resetBudgetInactivityTimer = useCallback(() => {
    if (budgetInactivityTimerRef.current) {
      window.clearTimeout(budgetInactivityTimerRef.current);
    }
    if (!activeProjectId || !isBudgetExpanded) return;

    budgetInactivityTimerRef.current = window.setTimeout(() => {
      setIsBudgetExpanded(false);
    }, BUDGET_INACTIVITY_MS);
  }, [activeProjectId, isBudgetExpanded]);

  useEffect(() => {
    resetFilterCollapseTimer();
    return () => {
      if (filterCollapseTimerRef.current) {
        window.clearTimeout(filterCollapseTimerRef.current);
      }
    };
  }, [resetFilterCollapseTimer]);

  useEffect(() => {
    resetBudgetInactivityTimer();
    return () => {
      if (budgetInactivityTimerRef.current) {
        window.clearTimeout(budgetInactivityTimerRef.current);
      }
    };
  }, [resetBudgetInactivityTimer]);

  useEffect(() => {
    if (!activeProjectId || !isBudgetExpanded) return undefined;

    const pageElement = pageRef.current;
    if (!pageElement) return undefined;

    function handleScroll() {
      setIsBudgetExpanded(false);
    }

    function handleActivity() {
      resetBudgetInactivityTimer();
    }

    pageElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      pageElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [activeProjectId, isBudgetExpanded, resetBudgetInactivityTimer]);

  function handleFilterInteract() {
    resetFilterCollapseTimer();
  }

  function handleExpandFilters() {
    setIsFilterExpanded(true);
  }

  function handleCollapseFilters() {
    setIsFilterExpanded(false);
  }

  function handleBudgetInteract() {
    resetBudgetInactivityTimer();
  }

  function handleExpandBudget() {
    setIsBudgetExpanded(true);
  }

  function handleCollapseBudget() {
    setIsBudgetExpanded(false);
  }

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

  function handleCategorySelect(category) {
    setSelectedCategory(category?.value || category?.label || 'Tout');
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
      ref={pageRef}
      className={[
        'catalogue-page',
        'catalogue-page--products',
        hasCatalogueProducts ? '' : 'catalogue-page--empty',
        isFilterVisible ? 'catalogue-page--with-filters' : 'catalogue-page--filters-collapsed',
        isBudgetVisible ? 'catalogue-page--with-budget' : 'catalogue-page--budget-collapsed',
      ].filter(Boolean).join(' ')}
    >
      {isFilterVisible && (
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
          onInteract={handleFilterInteract}
          onMinimize={handleCollapseFilters}
        />
      )}

      {shouldShowFilterPanel && !isFilterExpanded && (
        <CatalogueDiscreteButton
          position="bottom-right"
          label="Filtres"
          iconName="Filter"
          onClick={handleExpandFilters}
        />
      )}

      <main className="catalogue-product-main">
        {hasCatalogueProducts && (
          <CatalogueCategories
            products={products}
            activeCategory={activeCategory === 'Tout' ? '' : activeCategory}
            onSelect={handleCategorySelect}
          />
        )}

        <div className="catalogue-product-grid-wrapper">
          <section className="catalogue-product-grid" aria-label="Articles du catalogue">
            {isLoadingProducts && (
              <div className="catalogue-empty-state">
                <Loader />
                <p>Chargement du catalogue...</p>
              </div>
            )}

            {!isLoadingProducts && productsError && (
              <p className="catalogue-empty-state">{productsError}</p>
            )}

            {!isLoadingProducts && !productsError && filteredProducts.length === 0 && (
              <p className="catalogue-empty-state">
                {hasCatalogueProducts
                  ? 'Aucun article ne correspond aux filtres actuels.'
                  : 'Aucun catalogue ou produits disponible'}
              </p>
            )}

            {!isLoadingProducts && !productsError && filteredProducts.map((product, index) => {
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
        </div>
      </main>

      {activeProjectId && isBudgetVisible && (
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
          onInteract={handleBudgetInteract}
          onMinimize={handleCollapseBudget}
        />
      )}

      {activeProjectId && !isBudgetExpanded && (
        <CatalogueDiscreteButton
          position="top-right"
          label="Budget"
          iconName="Wallet"
          onClick={handleExpandBudget}
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
