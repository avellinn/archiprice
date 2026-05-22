import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { fetchProducts } from '../services/products';
import './espacepro.css';

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return 'Budget non renseigné';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function extractProjectMetadata(project) {
  const description = project?.description || '';
  const roomMatch = description.match(/Type de pièce\s*:\s*(.+)/i);
  const budgetMatch = description.match(/Estimation budget\s*:\s*(.+)/i);

  return {
    roomType: roomMatch?.[1]?.trim() || 'Non renseigné',
    budget: budgetMatch?.[1]?.trim() || '',
  };
}

export default function EspacePro({
  projects,
  isProjectsLoading,
  projectsError,
  selectedProjectId,
  onProjectSelect,
  onProjectEdit,
  onProjectDelete,
  deletingProjectId,
  onProductsChange,
}) {
  const effectiveSelectedProjectId = selectedProjectId || projects[0]?.id || '';
  const selectedProject = projects.find((project) => project.id === effectiveSelectedProjectId) || projects[0];
  const projectMetadata = extractProjectMetadata(selectedProject);
  const [projectProducts, setProjectProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [activeArticleIndex, setActiveArticleIndex] = useState(0);
  const visibleProjectProducts = useMemo(
    () => (effectiveSelectedProjectId ? projectProducts : []),
    [effectiveSelectedProjectId, projectProducts],
  );
  const activeArticle = visibleProjectProducts.length > 0
    ? visibleProjectProducts[activeArticleIndex % visibleProjectProducts.length]
    : null;
  const activeArticlePosition = visibleProjectProducts.length > 0
    ? (activeArticleIndex % visibleProjectProducts.length) + 1
    : 0;
  const visibleIsProductsLoading = effectiveSelectedProjectId ? isProductsLoading : false;
  const articleSimulation = useMemo(() => {
    const total = visibleProjectProducts.reduce((sum, product) => sum + Number(product.unitPrice || 0), 0);
    const budget = Number(projectMetadata.budget || 0);

    return {
      count: visibleProjectProducts.length,
      total,
      budget,
      overage: budget > 0 ? Math.max(total - budget, 0) : 0,
    };
  }, [projectMetadata.budget, visibleProjectProducts]);

  useEffect(() => {
    if (!effectiveSelectedProjectId) {
      return undefined;
    }

    let cancelled = false;
    fetchProducts(effectiveSelectedProjectId)
      .then((products) => {
        if (!cancelled) {
          setProjectProducts(products);
          onProductsChange?.(products);
          setProductsError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectProducts([]);
          onProductsChange?.([]);
          setProductsError('Impossible de charger les articles du projet.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsProductsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedProjectId, onProductsChange]);

  function handleProjectSelect(projectId) {
    setIsProductsLoading(true);
    setProductsError('');
    onProjectSelect(projectId);
  }

  function handleArticleImageClick() {
    if (visibleProjectProducts.length <= 1) return;
    setActiveArticleIndex((currentIndex) => (currentIndex + 1) % visibleProjectProducts.length);
  }

  return (
    <div className="espacepro">
      <aside className="espacepro__projects" aria-label="Tous les projets créés">
        {isProjectsLoading && <p>Chargement des projets...</p>}
        {projectsError && <p>{projectsError}</p>}
        {!isProjectsLoading && !projectsError && projects.length === 0 && (
          <p>Aucun projet créé pour le moment.</p>
        )}
        {projects.map((project) => (
          <div
            className={[
              'espacepro__project-row',
              selectedProject?.id === project.id ? 'espacepro__project-row--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={project.id}
          >
            <button
              type="button"
              className="espacepro__project-item"
              onClick={() => handleProjectSelect(project.id)}
            >
              <span className="espacepro__project-icon">
                <Icon name="Folder" size="sm" />
              </span>
              <span>
                <strong>{project.name}</strong>
                <small>{formatDate(project.updatedAt || project.createdAt)}</small>
              </span>
            </button>
            <div className="espacepro__project-actions" aria-label={`Actions pour ${project.name}`}>
              <button
                type="button"
                className="espacepro__project-action espacepro__project-action--edit"
                aria-label={`Modifier ${project.name}`}
                onClick={() => onProjectEdit?.(project)}
              >
                <Icon name="Edit" size="sm" />
              </button>
              <button
                type="button"
                className="espacepro__project-action espacepro__project-action--delete"
                aria-label={`Supprimer ${project.name}`}
                disabled={deletingProjectId === project.id}
                onClick={() => onProjectDelete?.(project)}
              >
                <Icon name="Delete" size="sm" />
              </button>
            </div>
          </div>
        ))}
      </aside>

      <section className="espacepro__articles" aria-label="Articles choisis">
        <div className="espacepro__articles-header">
          <span>Articles choisis</span>
        </div>

        {visibleIsProductsLoading && <p className="espacepro__empty">Chargement des articles...</p>}
        {productsError && <p className="espacepro__empty">{productsError}</p>}
        {!visibleIsProductsLoading && !productsError && visibleProjectProducts.length === 0 && (
          <p className="espacepro__empty">Aucun article choisi pour ce projet.</p>
        )}
        {!visibleIsProductsLoading && !productsError && activeArticle && (
          <article className="espacepro__article-card espacepro__article-card--featured">
            <button
              type="button"
              className={[
                'espacepro__article-image',
                `espacepro__article-image--${activeArticleIndex % 3}`,
              ].join(' ')}
              aria-label={`Afficher l'article suivant après ${activeArticle.name}`}
              onClick={handleArticleImageClick}
            >
              <span>{activeArticle.name.slice(0, 2).toUpperCase()}</span>
              <small>{activeArticlePosition}/{visibleProjectProducts.length}</small>
              <i aria-hidden="true" style={{ '--article-pattern-offset': `${activeArticleIndex * 18}px` }} />
            </button>
            <div className="espacepro__article-body">
              <h3>{activeArticle.name}</h3>
              <p>{activeArticle.category || 'Catégorie non renseignée'}</p>
              <strong>{formatCurrency(activeArticle.unitPrice)}</strong>
            </div>
          </article>
        )}
      </section>

      <aside className="espacepro__info" aria-label="Information sur le projet">
        <section className="espacepro__info-section">
          <h2>Information sur le projet</h2>
          {selectedProject ? (
            <dl>
              <div>
                <dt>Nom</dt>
                <dd>{selectedProject.name}</dd>
              </div>
              <div>
                <dt>Type de pièce</dt>
                <dd>{projectMetadata.roomType}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{projectMetadata.budget ? formatCurrency(projectMetadata.budget) : 'Budget non renseigné'}</dd>
              </div>
              <div>
                <dt>Articles</dt>
                <dd>{articleSimulation.count}</dd>
              </div>
              <div>
                <dt>Simulation achat</dt>
                <dd>{formatCurrency(articleSimulation.total)}</dd>
              </div>
              <div>
                <dt>Dépassement</dt>
                <dd>{articleSimulation.overage > 0 ? formatCurrency(articleSimulation.overage) : 'Aucun'}</dd>
              </div>
            </dl>
          ) : (
            <p>Aucun projet sélectionné.</p>
          )}
        </section>

      </aside>
    </div>
  );
}
