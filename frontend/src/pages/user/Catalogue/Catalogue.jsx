import './Catalogue.css';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import Newproject from '../../../components/Newproject';
import Recap from '../../../components/recap';
import { Alert, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { createExportedProductSnapshot } from '../../../utils/productPresentation';
import { upsertProjectArchive } from '../../../services/exportedDocuments';
import { createProduct, deleteProduct, fetchProducts } from '../../../services/products';
import { createProject, updateProject } from '../../../services/projects';
import SimulBudget from '../../../components/simulBudget';
import CatalogueFilterpanel from './CatalogueFilterpanel';
import CatalogueCategories from './CatalogueCategories';
import CatalogueFullscreen from './CatalogueFullscreen';
import { useCatalogueProducts, formatFCFA, formatCurrency, formatOptionalCurrency, formatProductPrice, normalizeBudgetInput, formatBudgetInputValue } from './useCatalogueProducts';
import { useCatalogueFilters } from './useCatalogueFilters';
import { useBudgetSimulation } from './useBudgetSimulation';
import { useProjectGate, setProjectGateGraceEnd } from './useProjectGate';
import { buildProjectDescription, buildProjectProductPayload, getGeneratedProjectName, isProductSelected, projectProductMatchesCatalogue } from './catalogueUtils';
import { mergeSelectedProductIds, normalizeProductSelectionIds } from '../../../utils/catalogueNavigation';

/* ── Bouton discret flottant ── */

function CatalogueDiscreteButton({ position, label, iconName, onClick }) {
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

/* ── CardArticle ── */

function ArticleImage({ image, tone, label, className = '', onClick, children }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={[
        'catalogue-product-photo',
        `catalogue-product-photo--${tone}`,
        image ? 'has-image' : '',
        onClick ? 'catalogue-product-photo--clickable' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick(event);
      }}
    >
      {image && <img src={image} alt="" loading="lazy" />}
      <span>{label}</span>
      {children}
    </div>
  );
}

function CardArticle({ product, isSelected, priceRange, onOpen, onDetailsOpen, onToggle }) {
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
      style={product.image ? { '--catalogue-product-card-background': `url(${JSON.stringify(product.image)})` } : undefined}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={handleKeyDown}
    >
      <ArticleImage
        image={product.image}
        tone={product.tone}
        label={product.category}
        onClick={(event) => { event.stopPropagation(); onDetailsOpen(product.id); }}
      >
        {images.length > 1 && (
          <small className="catalogue-product-photo__count">{images.length} images</small>
        )}
      </ArticleImage>

      <div
        className="catalogue-product-card__body"
        role="button"
        tabIndex={-1}
        onClick={(event) => { event.stopPropagation(); onDetailsOpen(product.id); }}
      >
        <button
          type="button"
          className="catalogue-product-card__detail-trigger"
          onClick={(event) => { event.stopPropagation(); onDetailsOpen(product.id); }}
        >
          <h3>{product.name}</h3>
          <p>{product.shop} · {product.shopZone}</p>
        </button>
        <strong>{priceRange}</strong>
        <button
          type="button"
          className={['catalogue-product-card__add', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
          onClick={(event) => { event.stopPropagation(); onToggle(product.id); }}
        >
          <Icon name={isSelected ? 'Check' : 'Add'} size="sm" />
          {isSelected ? 'Ajouté' : 'Ajouter'}
        </button>
      </div>
    </article>
  );
}

/* ── Page principale ── */

export default function Catalogue() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isRecapVisible, setIsRecapVisible] = useState(false);
  const [fullscreenProductId, setFullscreenProductId] = useState('');
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  // ── Initialisation depuis location.state (retour depuis fiche produit) ──
  const initialSnapshot = location.state?.catalogueSnapshot || {};
  const initialProductIds = useMemo(() => {
    const snapshotIds = normalizeProductSelectionIds(initialSnapshot.selectedProductIds);
    const explicitIds = normalizeProductSelectionIds([
      location.state?.selectedProductId,
      location.state?.addedProductId,
      location.state?.selectedProductIds,
    ]);
    return snapshotIds.length > 0 ? mergeSelectedProductIds(snapshotIds, explicitIds) : explicitIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hooks extraits ──
  const {
    products,
    publishedCatalogueProducts,
    isLoadingProducts,
    productsError,
  } = useCatalogueProducts();

  const catalogueSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const {
    filters,
    activeCategory,
    activeRoom,
    activeRange,
    activeCity,
    activeNeighborhood,
    setSelectedCategory,
    setSelectedRoom,
    setSelectedRange,
    setSelectedCity,
    setSelectedNeighborhood,
    filteredProducts,
    isFilterExpanded,
    shouldShowFilterPanel,
    handleExpandFilters,
    handleCollapseFilters,
    handleFilterInteract,
    roomOptions,
  } = useCatalogueFilters({
    products,
    publishedCatalogueProducts,
    catalogueSearchTerm,
    initialSnapshot,
  });

  const {
    budgetTarget,
    setBudgetTarget,
    selectedProductIds,
    setSelectedProductIds,
    selectedProducts,
    budgetSummary,
    isBudgetExpanded,
    setIsBudgetExpanded,
    canDisplayBudget,
    expandBudget,
    scheduleBudgetCollapse,
    toggleProduct: toggleProductInBudget,
  } = useBudgetSimulation({
    products,
    initialBudgetTarget: initialSnapshot.budgetTarget || '',
    initialProductIds,
    initialExpanded: Boolean(
      location.state?.selectedProductId ||
      location.state?.addedProductId ||
      location.state?.selectedProductIds?.length
    ),
  });

  const {
    activeProjectId,
    currentProject,
    setCurrentProject,
    pendingProjectPayload,
    isProjectGateCompleted,
    setIsProjectGateCompleted,
    isProjectGateForced,
    setIsProjectGateForced,
    gateOpen,
    skipProjectGate,
    isWithinGracePeriod,
    setIsWithinGracePeriod,
    projectsChecked,
    hasProjectInProgress,
    handleProjectGateCreated,
    handleGateCancel,
    handleWorkspaceReturn,
  } = useProjectGate({
    products,
    setBudgetTarget,
    setSelectedProductIds,
    setValidationError,
    setIsRecapVisible,
    setSuccessMessage,
    expandBudget,
  });

  // ── Dérivés ──
  const isTreated = currentProject?.status === 'treated';
  const hasCatalogueProducts = products.length > 0;
  const isFilterVisible = shouldShowFilterPanel && isFilterExpanded;
  const isBudgetDisplayed = canDisplayBudget({
    isProjectGateCompleted,
    activeProjectId,
    pendingProjectPayload,
  }) && isBudgetExpanded;

  const generatedAt = useMemo(
    () => new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date()),
    [],
  );

  const fullscreenProduct = products.find((p) => p.id === fullscreenProductId);
  const fullscreenImage = fullscreenProduct?.images?.[fullscreenImageIndex] || fullscreenProduct?.image || '';

  // ── Handlers ──
  function toggleProduct(productId) {
    const action = toggleProductInBudget(productId, { isTreated });
    if (action === 'locked') return;
    setValidationError('');
    setIsRecapVisible(false);
    if (action === 'added') setSuccessMessage('Produit ajouté avec succès.');
    if (action === 'removed') setSuccessMessage('Produit retiré avec succès.');
  }

  function openFullscreenProduct(productId) {
    setFullscreenProductId(productId);
    setFullscreenImageIndex(0);
  }

  function openProductDetails(productId) {
    navigate(`/fiche-produits/${productId}${location.search || ''}`, {
      state: {
        isSelected: isProductSelected(productId, selectedProductIds),
        from: { pathname: '/catalogue', search: location.search || '' },
        catalogueSnapshot: {
          selectedProductIds,
          selectedCategory: activeCategory,
          selectedRoom: activeRoom,
          selectedRange: activeRange,
          selectedCity: activeCity,
          selectedNeighborhood: activeNeighborhood,
          budgetTarget,
        },
      },
    });
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

  async function syncProjectProducts(projectId) {
    const existingProducts = await fetchProducts(projectId);
    const productsToDelete = existingProducts.filter((pp) => (
      !selectedProducts.some((cp) => projectProductMatchesCatalogue(pp, cp))
    ));
    const productsToCreate = selectedProducts.filter((cp) => (
      !existingProducts.some((pp) => projectProductMatchesCatalogue(pp, cp))
    ));
    await Promise.all([
      ...productsToDelete.map((p) => deleteProduct(projectId, p.id)),
      ...productsToCreate.map((p) => createProduct(projectId, buildProjectProductPayload(p))),
    ]);
  }

  async function handleBudgetValidation() {
    if (isTreated) return;
    if (selectedProducts.length === 0) return;
    if (!budgetSummary.hasTarget) {
      setValidationError('Renseignez un budget cible avant de valider la simulation.');
      return;
    }
    if (!activeProjectId && !pendingProjectPayload) {
      setValidationError('Renseignez d\u2019abord les informations du projet.');
      setIsProjectGateCompleted(false);
      setIsProjectGateForced(true);
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const baseProject = currentProject || pendingProjectPayload;
      const description = buildProjectDescription({ selectedProducts, budgetSummary, baseDescription: baseProject?.description });
      const effectiveProjectId = activeProjectId
        || (pendingProjectPayload?.id && !String(pendingProjectPayload.id).startsWith('local-project-')
          ? pendingProjectPayload.id : '');

      const project = effectiveProjectId
        ? await updateProject(effectiveProjectId, { description, status: 'draft', budgetTarget: budgetSummary.target })
        : await createProject({
            name: pendingProjectPayload.name || getGeneratedProjectName(),
            description,
            status: 'draft',
            budgetTarget: budgetSummary.target,
          });

      if (String(project.id).startsWith('local-project-')) {
        throw new Error('La base de données doit être disponible pour démarrer le projet.');
      }

      await syncProjectProducts(project.id);
      setSuccessMessage(activeProjectId ? 'Budget mis à jour avec succès.' : 'Projet créé avec succès.');
      setCurrentProject(project);
      setIsRecapVisible(true);
      setProjectGateGraceEnd();
      setIsWithinGracePeriod(true);
      navigate(`/catalogue?projectId=${project.id}&recap=1`, {
        replace: true,
        state: { from: location.state?.from || { pathname: '/espacepro', search: `?projectId=${project.id}` } },
      });
    } catch (error) {
      setValidationError(getApiErrorMessage(error, 'Impossible de démarrer le projet'));
    } finally {
      setIsValidating(false);
    }
  }

  async function handleConfirmValidation() {
    if (isTreated) return;
    if (selectedProducts.length === 0) return;
    if (!budgetSummary.hasTarget) {
      setValidationError('Renseignez un budget cible avant de confirmer la validation.');
      return;
    }
    if (!activeProjectId) {
      setValidationError('Validez d\u2019abord le budget afin de créer le projet en cours.');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const description = buildProjectDescription({ selectedProducts, budgetSummary, baseDescription: currentProject?.description });
      await syncProjectProducts(activeProjectId);
      const project = await updateProject(activeProjectId, { description, status: 'treated', budgetTarget: budgetSummary.target });

      // Action B — Validation projet : archive sans créer de Simulation (pas un export PDF).
      upsertProjectArchive({
        projectId: project.id,
        projectName: project.name,
        userName: user?.name || user?.fullName || user?.email || 'Utilisateur ArchiPrice',
        userEmail: user?.email || '',
        reference: `SIM-${project.id}`,
        amount: budgetSummary.max,
        itemCount: selectedProducts.length,
        status: 'Succès',
        city: [...new Set(selectedProducts.map((p) => p.city).filter(Boolean))].join(', ') || project.name,
        coefficient: '1,00',
        items: selectedProducts.map((p) => ({
          ...createExportedProductSnapshot(p),
          id: p.id,
          name: p.name,
          category: p.category,
          quantity: 1,
          price: formatFCFA(p.maxPrice),
          total: formatFCFA(p.maxPrice),
          rawPrice: p.maxPrice,
          imageUrl: p.image,
          images: (p.imageDocuments || []).length > 0
            ? p.imageDocuments
            : (p.images || []).map((img) => ({ secure_url: img, name: p.name })),
        })),
      });

      navigate(`/espacepro?projectId=${project.id}`, { replace: true });
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
        isFilterVisible ? 'catalogue-page--with-filters' : 'catalogue-page--filters-collapsed',
        isBudgetDisplayed ? 'catalogue-page--with-budget' : 'catalogue-page--budget-collapsed',
      ].filter(Boolean).join(' ')}
    >
      {isFilterVisible && (
        <CatalogueFilterpanel
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

      {canDisplayBudget({ isProjectGateCompleted, activeProjectId, pendingProjectPayload }) && !isBudgetExpanded && (
        <CatalogueDiscreteButton
          position="top-right"
          label="Budget"
          iconName="ReceiptLong"
          onClick={expandBudget}
        />
      )}

      <main className="catalogue-product-main">
        {isTreated && (
          <Alert variant="info" layout="inline">Ce projet est traité.</Alert>
        )}
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
              <Alert variant="danger" layout="inline">{productsError}</Alert>
            )}
            {!isLoadingProducts && !productsError && filteredProducts.length === 0 && (
              <p className="catalogue-empty-state">
                {hasCatalogueProducts
                  ? 'Aucun article ne correspond aux filtres actuels.'
                  : 'Aucun catalogue ou produits disponible'}
              </p>
            )}
            {!isLoadingProducts && !productsError && filteredProducts.map((product, index) => (
              <CardArticle
                key={`${product.id || product.name}-${index}`}
                product={product}
                isSelected={isProductSelected(product.id, selectedProductIds)}
                priceRange={formatProductPrice(product)}
                onOpen={openFullscreenProduct}
                onDetailsOpen={openProductDetails}
                onToggle={toggleProduct}
              />
            ))}
          </section>
        </div>
      </main>

      {isBudgetDisplayed && (
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
          onInteract={scheduleBudgetCollapse}
          onMinimize={() => setIsBudgetExpanded(false)}
          isValidating={isValidating}
          isLocked={isTreated}
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
          isLocked={isTreated}
        />
      )}

      <Newproject
        isOpen={gateOpen}
        onCancel={handleGateCancel}
        onCreated={handleProjectGateCreated}
        roomTypes={roomOptions}
      />

      {fullscreenProduct && (
        <CatalogueFullscreen
          product={fullscreenProduct}
          image={fullscreenImage}
          imageIndex={fullscreenImageIndex}
          isSelected={isProductSelected(fullscreenProduct.id, selectedProductIds)}
          priceRange={formatProductPrice(fullscreenProduct)}
          onClose={() => setFullscreenProductId('')}
          onImageSelect={setFullscreenImageIndex}
          onToggle={toggleProduct}
        />
      )}

      {successMessage && (
        <Alert
          variant="success"
          layout="toast"
          autoCloseMs={3500}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}
    </div>
  );
}
