import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { getApiErrorMessage } from '../../services/api';
import { createProduct } from '../../services/products';
import { createProject, fetchProjects, updateProject } from '../../services/projects';

const FILTERS = {
  categories: ['Tout', 'Mobilier', 'Luminaire', 'Revêtement', 'Sanitaire', 'Décoration'],
  rooms: ['Toutes', 'Salon', 'Chambre', 'Bureau', 'Douche', 'Appartement', 'Espace externe'],
  ranges: ['Toutes', 'Essentiel', 'Confort', 'Premium'],
};

const PRODUCTS = [
  {
    id: 'canape-lima',
    name: 'Canapé Lima',
    category: 'Mobilier',
    room: 'Salon',
    range: 'Confort',
    minPrice: 185000,
    maxPrice: 320000,
    shop: 'Maison Pro',
    tone: 'linen',
  },
  {
    id: 'suspension-nova',
    name: 'Suspension Nova',
    category: 'Luminaire',
    room: 'Salon',
    range: 'Premium',
    minPrice: 42000,
    maxPrice: 88000,
    shop: 'BatiPlus Déco',
    tone: 'amber',
  },
  {
    id: 'carrelage-matera',
    name: 'Carrelage Matera',
    category: 'Revêtement',
    room: 'Appartement',
    range: 'Confort',
    minPrice: 9500,
    maxPrice: 18000,
    shop: 'Archi Matériaux',
    tone: 'stone',
  },
  {
    id: 'vasque-elio',
    name: 'Vasque Elio',
    category: 'Sanitaire',
    room: 'Douche',
    range: 'Premium',
    minPrice: 76000,
    maxPrice: 145000,
    shop: 'Maison Pro',
    tone: 'ceramic',
  },
  {
    id: 'bureau-oslo',
    name: 'Bureau Oslo',
    category: 'Mobilier',
    room: 'Bureau',
    range: 'Essentiel',
    minPrice: 68000,
    maxPrice: 125000,
    shop: 'Maison Pro',
    tone: 'wood',
  },
  {
    id: 'fauteuil-kora',
    name: 'Fauteuil Kora',
    category: 'Mobilier',
    room: 'Chambre',
    range: 'Confort',
    minPrice: 54000,
    maxPrice: 98000,
    shop: 'BatiPlus Déco',
    tone: 'sage',
  },
  {
    id: 'applique-mina',
    name: 'Applique Mina',
    category: 'Luminaire',
    room: 'Chambre',
    range: 'Essentiel',
    minPrice: 18000,
    maxPrice: 39000,
    shop: 'Archi Matériaux',
    tone: 'night',
  },
  {
    id: 'table-terrasse',
    name: 'Table terrasse',
    category: 'Décoration',
    room: 'Espace externe',
    range: 'Premium',
    minPrice: 115000,
    maxPrice: 210000,
    shop: 'Jardin & Terrasse',
    tone: 'garden',
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildProjectDescription({ selectedProducts, budgetTarget, budgetSummary }) {
  const rooms = [...new Set(selectedProducts.map((product) => product.room))].join(', ');
  const shops = [...new Set(selectedProducts.map((product) => product.shop))].join(', ');
  const productList = selectedProducts.map((product) => `- ${product.name} (${product.shop})`).join('\n');

  return [
    `Type de pièce : ${rooms || 'Non renseigné'}`,
    `Estimation budget : ${budgetTarget}`,
    `Estimation min : ${budgetSummary.min}`,
    `Estimation max : ${budgetSummary.max}`,
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

export default function Catalogue() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedRoom, setSelectedRoom] = useState('Toutes');
  const [selectedRange, setSelectedRange] = useState('Toutes');
  const [budgetTarget, setBudgetTarget] = useState(650000);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [fullscreenProductId, setFullscreenProductId] = useState('');
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (!projectIdFromUrl) return undefined;

    let cancelled = false;

    fetchProjects()
      .then((projects) => {
        if (cancelled) return;

        const currentProject = projects.find((project) => project.id === projectIdFromUrl);
        const projectBudget = extractProjectBudget(currentProject);

        if (projectBudget) {
          setBudgetTarget(projectBudget);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const filteredProducts = useMemo(
    () => PRODUCTS.filter((product) => (
      (selectedCategory === 'Tout' || product.category === selectedCategory)
      && (selectedRoom === 'Toutes' || product.room === selectedRoom)
      && (selectedRange === 'Toutes' || product.range === selectedRange)
    )),
    [selectedCategory, selectedRange, selectedRoom],
  );

  const selectedProducts = useMemo(
    () => PRODUCTS.filter((product) => selectedProductIds.includes(product.id)),
    [selectedProductIds],
  );

  const budgetSummary = useMemo(() => {
    const min = selectedProducts.reduce((total, product) => total + product.minPrice, 0);
    const max = selectedProducts.reduce((total, product) => total + product.maxPrice, 0);
    const overage = Math.max(max - budgetTarget, 0);

    return { min, max, overage };
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
  const fullscreenProduct = PRODUCTS.find((product) => product.id === fullscreenProductId);

  function toggleProduct(productId) {
    setIsSummaryDismissed(false);
    setSelectedProductIds((currentIds) => (
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId]
    ));
  }

  function handleProductKeyDown(event, productId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFullscreenProductId(productId);
    }
  }

  function handleModifyPurchase() {
    setIsSummaryDismissed(true);
    setValidationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/catalogue${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, { replace: true });
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

  async function handleConfirmValidation() {
    if (selectedProducts.length === 0) return;

    setIsValidating(true);
    setValidationError('');

    try {
      const projectIdFromUrl = searchParams.get('projectId');
      const description = buildProjectDescription({ selectedProducts, budgetTarget, budgetSummary });
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
      })));

      navigate(`/workspace?mode=projects&projectId=${project.id}`, { replace: true });
    } catch (error) {
      setValidationError(getApiErrorMessage(error, 'Impossible de confirmer la validation'));
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <div className="catalogue-page catalogue-page--products">
      <aside className="catalogue-filter-panel" aria-label="Filtres du catalogue">
        <div>
          <button
            type="button"
            className="catalogue-workspace-return"
            onClick={handleWorkspaceReturn}
          >
            <Icon name="ArrowLeft" size="sm" />
            return
          </button>
          <span className="catalogue-eyebrow">Explorer Catalogue</span>
          <h1>Filtres</h1>
        </div>

        <section className="catalogue-filter-group">
          <h2>Catégorie</h2>
          <div>
            {FILTERS.categories.map((category) => (
              <button
                type="button"
                className={selectedCategory === category ? 'is-active' : ''}
                key={category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="catalogue-filter-group">
          <h2>Pièce</h2>
          <div>
            {FILTERS.rooms.map((room) => (
              <button
                type="button"
                className={selectedRoom === room ? 'is-active' : ''}
                key={room}
                onClick={() => setSelectedRoom(room)}
              >
                {room}
              </button>
            ))}
          </div>
        </section>

        <section className="catalogue-filter-group">
          <h2>Gamme</h2>
          <div>
            {FILTERS.ranges.map((range) => (
              <button
                type="button"
                className={selectedRange === range ? 'is-active' : ''}
                key={range}
                onClick={() => setSelectedRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="catalogue-product-main">
        <div className="catalogue-product-heading">
          <div>
            <span className="catalogue-eyebrow">Cartes produits</span>
            <h2>{filteredProducts.length} produits disponibles</h2>
          </div>

        </div>

        <section className="catalogue-product-grid" aria-label="Produits du catalogue">
          {filteredProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);

            return (
              <article
                className="catalogue-product-card"
                key={product.id}
                role="button"
                tabIndex={0}
                onClick={() => setFullscreenProductId(product.id)}
                onKeyDown={(event) => handleProductKeyDown(event, product.id)}
              >
                <div className={`catalogue-product-photo catalogue-product-photo--${product.tone}`}>
                  <span>{product.category}</span>
                </div>
                <div className="catalogue-product-card__body">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.shop}</p>
                  </div>
                  <strong>
                    {formatCurrency(product.minPrice)} - {formatCurrency(product.maxPrice)}
                  </strong>
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? 'outline' : 'primary'}
                    icon={<Icon name={isSelected ? 'Check' : 'Add'} size="sm" />}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleProduct(product.id);
                    }}
                  >
                    {isSelected ? 'Ajouté' : 'Ajouter'}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <aside className="catalogue-budget-panel" aria-label="Simulation budget live">
        <div className="catalogue-budget-card">
          <span className="catalogue-eyebrow">Simulation budget live</span>
          <h2>Budget</h2>

          <label className="catalogue-budget-field">
            Budget cible
            <input
              type="number"
              min="0"
              step="10000"
              value={budgetTarget}
              onChange={(event) => setBudgetTarget(Number(event.target.value))}
            />
          </label>

          <dl className="catalogue-budget-list">
            <div>
              <dt>Estimation min</dt>
              <dd>{formatCurrency(budgetSummary.min)}</dd>
            </div>
            <div>
              <dt>Estimation max</dt>
              <dd>{formatCurrency(budgetSummary.max)}</dd>
            </div>
            <div className={budgetSummary.overage > 0 ? 'is-over' : 'is-ok'}>
              <dt>Dépassement éventuel</dt>
              <dd>{budgetSummary.overage > 0 ? formatCurrency(budgetSummary.overage) : 'Aucun'}</dd>
            </div>
          </dl>

          <p>
            {selectedProducts.length === 0
              ? 'Ajoutez des produits pour lancer la simulation.'
              : `${selectedProducts.length} produit(s) ajouté(s) au panier budget.`}
          </p>
        </div>
      </aside>

      {selectedProducts.length > 0 && !isSummaryDismissed && (
        <section className="catalogue-summary-panel" aria-label="Récapitulatif des articles">
          <div className="catalogue-summary-card">
            <header className="catalogue-summary-header">
              <span className="catalogue-summary-folder" aria-hidden="true">
                <Icon name="Folder" size="sm" />
              </span>
              <h2>Récapitulatif de Liquidation</h2>
              <button
                type="button"
                aria-label="Fermer le récapitulatif"
                onClick={() => setIsSummaryDismissed(true)}
              >
                <Icon name="Close" size="sm" />
              </button>
            </header>

            <div className="catalogue-summary-body">
              <h3>
                <Icon name="ArrowUp" size="sm" />
                Informations Générales
              </h3>

              <div className="catalogue-summary-info-grid">
                <div>
                  <span>Budget cible</span>
                  <strong>{formatCurrency(budgetTarget)}</strong>
                </div>
                <div>
                  <span>Articles choisis</span>
                  <strong>{selectedProducts.length}</strong>
                </div>
                <div>
                  <span>Boutiques</span>
                  <strong>{new Set(selectedProducts.map((product) => product.shop)).size}</strong>
                </div>
                <div>
                  <span>Statut</span>
                  <strong>{budgetSummary.overage > 0 ? 'Dépassement' : 'Contrôlé'}</strong>
                </div>
              </div>

              <div className="catalogue-summary-tags">
                {selectedProducts.slice(0, 4).map((product) => (
                  <span key={product.id}>{product.name}</span>
                ))}
              </div>

              <h3>
                <Icon name="Info" size="sm" />
                Volumes budget (FCFA)
              </h3>

              <div className="catalogue-summary-volume">
                <div>
                  <span>Constaté min</span>
                  <strong>{formatCurrency(budgetSummary.min)}</strong>
                </div>
                <div>
                  <span>Ecart</span>
                  <strong className={budgetSummary.overage > 0 ? 'is-danger' : ''}>
                    {formatCurrency(budgetSummary.overage)}
                  </strong>
                </div>
                <div>
                  <span>Accordé max</span>
                  <strong>{formatCurrency(budgetSummary.max)}</strong>
                </div>
              </div>

              <p className="catalogue-summary-valid">
                <Icon name="CheckCircle" size="sm" />
                Volume accordé : estimation calculée sur les articles sélectionnés
              </p>

              <h3>
                <Icon name="ReceiptLong" size="sm" />
                Calcul Fiscal
              </h3>

              <div className={budgetSummary.overage > 0 ? 'catalogue-summary-alert' : 'catalogue-summary-alert is-exempt'}>
                <strong>{budgetSummary.overage > 0 ? 'A DOSSIER À AJUSTER' : 'DOSSIER CONTRÔLÉ'}</strong>
                <span>
                  {budgetSummary.overage > 0
                    ? 'Le montant maximal dépasse le budget cible. Révisez les articles ou ajustez le budget.'
                    : 'Ce panier reste conforme au budget cible défini pour le projet.'}
                </span>
              </div>

              <div className="catalogue-summary-total">
                <span>Montant total à payer</span>
                <strong>{budgetSummary.overage > 0 ? formatCurrency(budgetSummary.max) : 'EXONÉRÉ'}</strong>
                <small>{budgetSummary.overage > 0 ? 'Dépassement potentiel inclus' : 'Exonération légale'}</small>
              </div>
            </div>

            <footer className="catalogue-summary-footer">
              <span>Généré le {generatedAt}</span>
              <span>Réf. Dossier : #{searchParams.get('projectId') || 'ARCHI-CATALOGUE'}</span>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  icon={<Icon name="ArrowLeft" size="sm" />}
                  onClick={handleModifyPurchase}
                  disabled={isValidating}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="success"
                  icon={<Icon name="Check" size="sm" />}
                  onClick={handleConfirmValidation}
                  isLoading={isValidating}
                >
                  Confirmer la Validation
                </Button>
              </div>
              {validationError && <p className="catalogue-summary-error">{validationError}</p>}
            </footer>
          </div>
        </section>
      )}

      {fullscreenProduct && (
        <div className="catalogue-fullscreen" role="dialog" aria-modal="true" aria-label={fullscreenProduct.name}>
          <button
            type="button"
            className="catalogue-fullscreen__close"
            aria-label="Fermer le mode plein écran"
            onClick={() => setFullscreenProductId('')}
          >
            <Icon name="Close" />
          </button>
          <article className="catalogue-fullscreen__card">
            <div className={`catalogue-fullscreen__visual catalogue-product-photo--${fullscreenProduct.tone}`}>
              <span>{fullscreenProduct.category}</span>
            </div>
            <div className="catalogue-fullscreen__content">
              <span className="catalogue-eyebrow">{fullscreenProduct.room} · {fullscreenProduct.range}</span>
              <h2>{fullscreenProduct.name}</h2>
              <p>{fullscreenProduct.shop}</p>
              <strong>
                {formatCurrency(fullscreenProduct.minPrice)} - {formatCurrency(fullscreenProduct.maxPrice)}
              </strong>
              <Button
                type="button"
                icon={<Icon name={selectedProductIds.includes(fullscreenProduct.id) ? 'Check' : 'Add'} size="sm" />}
                onClick={() => toggleProduct(fullscreenProduct.id)}
              >
                {selectedProductIds.includes(fullscreenProduct.id) ? 'Retirer du choix' : 'Ajouter au budget'}
              </Button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
