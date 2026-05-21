import { useEffect, useState } from 'react';
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
}) {
  const effectiveSelectedProjectId = selectedProjectId || projects[0]?.id || '';
  const selectedProject = projects.find((project) => project.id === effectiveSelectedProjectId) || projects[0];
  const projectMetadata = extractProjectMetadata(selectedProject);
  const [projectProducts, setProjectProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    if (!effectiveSelectedProjectId) return;

    let cancelled = false;

    fetchProducts(effectiveSelectedProjectId)
      .then((products) => {
        if (!cancelled) {
          setProjectProducts(products);
          setProductsError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectProducts([]);
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
  }, [effectiveSelectedProjectId]);

  function handleProjectSelect(projectId) {
    setIsProductsLoading(true);
    setProductsError('');
    onProjectSelect(projectId);
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
          <button
            type="button"
            className={[
              'espacepro__project-item',
              selectedProject?.id === project.id ? 'espacepro__project-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={project.id}
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
        ))}
      </aside>

      <section className="espacepro__articles" aria-label="Articles choisis">
        <div className="espacepro__articles-header">
          <span>Articles choisis</span>
        </div>

        {isProductsLoading && <p className="espacepro__empty">Chargement des articles...</p>}
        {productsError && <p className="espacepro__empty">{productsError}</p>}
        {!isProductsLoading && !productsError && projectProducts.length === 0 && (
          <p className="espacepro__empty">Aucun article choisi pour ce projet.</p>
        )}
        {!isProductsLoading && !productsError && projectProducts.length > 0 && (
          <div className="espacepro__article-list">
            {projectProducts.map((product, index) => (
              <article className="espacepro__article-card" key={product.id}>
                <div className="espacepro__article-image">
                  <span>{product.name.slice(0, 2).toUpperCase()}</span>
                  <i aria-hidden="true" style={{ '--article-pattern-offset': `${index * 18}px` }} />
                </div>
                <div className="espacepro__article-body">
                  <h3>{product.name}</h3>
                  <p>{product.category || 'Catégorie non renseignée'}</p>
                  <strong>{formatCurrency(product.unitPrice)}</strong>
                </div>
              </article>
            ))}
          </div>
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
            </dl>
          ) : (
            <p>Aucun projet sélectionné.</p>
          )}
        </section>

      </aside>
    </div>
  );
}
