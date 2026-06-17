import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { Alert, Button, Loader } from './ui';
import useAuth from '../context/useAuth';
import { getApiErrorMessage } from '../services/api';
import { addExportedDocument } from '../services/exportedDocuments';
import { fetchProducts } from '../services/products';
import { downloadProjectRecapPdf } from '../services/projects';
import { API_ROUTES } from '../constants/api';
import './espacepro.css';

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value));
}

function parseAmount(value) {
  const amount = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function formatCurrency(value) {
  const amount = parseAmount(value);
  return formatFCFA(amount);
}

function formatOptionalCurrency(value) {
  const amount = parseAmount(value);
  return amount > 0 ? formatFCFA(amount) : 'Budget non renseigné';
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

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;

  return image.secure_url || image.url || '';
}

function getProductImages(product) {
  const images = Array.isArray(product?.images)
    ? product.images.map(getImageUrl).filter(Boolean)
    : [];

  if (images.length > 0) return images;

  const singleImage = getImageUrl(product?.image);
  return singleImage ? [singleImage] : [];
}

function getProjectReference(project) {
  return project?.id ? String(project.id).slice(-8).toUpperCase() : 'ARCHI';
}

function getProjectRecapFileName(project) {
  const projectName = String(project?.name || 'recapitulatif')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${projectName || 'recapitulatif'}.pdf`;
}

function getProjectRecapHref(project) {
  if (!project?.id || String(project.id).startsWith('local-project-')) return '#';
  return API_ROUTES.projects.recapPdf(project.id);
}

function getRecapRows(products) {
  return products.map((product) => ({
    name: product.name || 'Article sans nom',
    category: product.category || 'Catégorie non renseignée',
    price: parseAmount(product.unitPrice),
    imageUrl: getProductImages(product)[0] || '',
    images: getProductImages(product),
  }));
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
  onArticleShopOpen,
}) {
  const { user } = useAuth();
  const effectiveSelectedProjectId = selectedProjectId || projects[0]?.id || '';
  const selectedProject = projects.find((project) => project.id === effectiveSelectedProjectId) || projects[0];
  const projectMetadata = extractProjectMetadata(selectedProject);
  const [projectProducts, setProjectProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [activeArticleIndex, setActiveArticleIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [isRecapDownloading, setIsRecapDownloading] = useState(false);
  const [recapError, setRecapError] = useState('');
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
  const activeArticleImages = getProductImages(activeArticle);
  const activeArticleImage = activeArticleImages.length > 0
    ? activeArticleImages[activeImageIndex % activeArticleImages.length]
    : '';
  const recapRows = useMemo(
    () => getRecapRows(visibleProjectProducts),
    [visibleProjectProducts],
  );
  const canShowRecapLink = Boolean(selectedProject && visibleProjectProducts.length > 0);
  const visibleIsProductsLoading = effectiveSelectedProjectId ? isProductsLoading : false;
  const articleSimulation = useMemo(() => {
    const total = visibleProjectProducts.reduce((sum, product) => sum + Number(product.unitPrice || 0), 0);
    const budget = parseAmount(projectMetadata.budget);

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
          setActiveArticleIndex(0);
          setActiveImageIndex(0);
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
    setActiveArticleIndex(0);
    setActiveImageIndex(0);
    setIsRecapOpen(false);
    setRecapError('');
    onProjectSelect(projectId);
  }

  function handleArticleImageClick() {
    if (activeArticleImages.length > 1) {
      const nextImageIndex = activeImageIndex + 1;
      if (nextImageIndex < activeArticleImages.length) {
        setActiveImageIndex(nextImageIndex);
        return;
      }

      setActiveImageIndex(0);
      if (visibleProjectProducts.length > 1) {
        setActiveArticleIndex((currentIndex) => (currentIndex + 1) % visibleProjectProducts.length);
      }
      return;
    }

    if (visibleProjectProducts.length <= 1) return;
    setActiveImageIndex(0);
    setActiveArticleIndex((currentIndex) => (currentIndex + 1) % visibleProjectProducts.length);
  }

  function handleArticleCardClick() {
    onArticleShopOpen?.(activeArticle);
  }

  function handleArticleCardKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleArticleCardClick();
  }

  async function handleDownloadRecap() {
    if (!selectedProject?.id || String(selectedProject.id).startsWith('local-project-')) {
      setRecapError('Ce projet doit être synchronisé avec MongoDB avant de générer un PDF serveur.');
      return;
    }

    setIsRecapDownloading(true);
    setRecapError('');

    try {
      const { blob, fileName } = await downloadProjectRecapPdf(selectedProject.id);
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
      addExportedDocument({
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        userName: user?.name || user?.fullName || user?.email || 'Utilisateur ArchiPrice',
        userEmail: user?.email || '',
        fileName,
        reference: getProjectReference(selectedProject),
        amount: articleSimulation.total,
        itemCount: articleSimulation.count,
        status: 'Succès',
        city: projectMetadata.roomType,
        coefficient: '1,00',
        items: recapRows.map((row) => ({
          name: row.name,
          category: row.category,
          quantity: 1,
          price: formatCurrency(row.price),
          total: formatCurrency(row.price),
          rawPrice: row.price,
          imageUrl: row.imageUrl,
          images: row.images,
        })),
      });
    } catch (error) {
      setRecapError(getApiErrorMessage(error, 'Impossible de générer le PDF'));
    } finally {
      setIsRecapDownloading(false);
    }
  }

  return (
    <div className="espacepro">
      <aside className="espacepro__projects" aria-label="Tous les projets créés">
        {isProjectsLoading && <Loader label="Chargement des projets..." />}
        {projectsError && <Alert variant="danger" className="espacepro__alert">{projectsError}</Alert>}
        {!isProjectsLoading && !projectsError && projects.length === 0 && (
          <p>Aucun projet créé pour le moment.</p>
        )}
        {projects.map((project, index) => (
          <div
            className={[
              'espacepro__project-row',
              selectedProject?.id === project.id ? 'espacepro__project-row--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={`${project.id || project.name}-${index}`}
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

        {visibleIsProductsLoading && <Loader className="espacepro__empty" label="Chargement des articles..." />}
        {productsError && <Alert variant="danger" className="espacepro__alert">{productsError}</Alert>}
        {!visibleIsProductsLoading && !productsError && visibleProjectProducts.length === 0 && (
          <p className="espacepro__empty">Aucun article choisi pour ce projet.</p>
        )}
        {!visibleIsProductsLoading && !productsError && activeArticle && (
          <article
            className="espacepro__article-card espacepro__article-card--featured"
            role="button"
            tabIndex={0}
            onClick={handleArticleCardClick}
            onKeyDown={handleArticleCardKeyDown}
          >
            <button
              type="button"
              className={[
                'espacepro__article-image',
                activeArticleImage ? 'espacepro__article-image--has-photo' : '',
                `espacepro__article-image--${activeArticleIndex % 3}`,
              ].filter(Boolean).join(' ')}
              aria-label={`Afficher l'article suivant après ${activeArticle.name}`}
              onClick={(event) => {
                event.stopPropagation();
                handleArticleImageClick();
              }}
            >
              {!activeArticleImage && <span>{activeArticle.name.slice(0, 2).toUpperCase()}</span>}
              <small>
                {activeArticleImages.length > 1
                  ? `${(activeImageIndex % activeArticleImages.length) + 1}/${activeArticleImages.length}`
                  : `${activeArticlePosition}/${visibleProjectProducts.length}`}
              </small>
              <i
                aria-hidden="true"
                style={{
                  '--article-pattern-offset': `${activeArticleIndex * 18}px`,
                  '--article-image-url': activeArticleImage ? `url("${activeArticleImage}")` : undefined,
                }}
              />
            </button>
            <div
              className="espacepro__article-body"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <h3>{activeArticle.name}</h3>
              <p>{activeArticle.category || 'Catégorie non renseignée'}</p>
              <strong>{formatCurrency(activeArticle.unitPrice)}</strong>
            </div>
            <footer className="espacepro__article-footer">
              {canShowRecapLink && (
                <div className="espacepro__recap-actions">
                  <a
                    className="espacepro__recap-link"
                    href={getProjectRecapHref(selectedProject)}
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      handleDownloadRecap();
                    }}
                  >
                    Télécharger le recap  {getProjectRecapFileName(selectedProject)}
                  </a>
                  <button
                    type="button"
                    className="espacepro__recap-open"
                    aria-label="Afficher le récapitulatif"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsRecapOpen(true);
                    }}
                  >
                    <Icon name="ReceiptLong" size="sm" />
                  </button>
                </div>
              )}
              <div className="workspace-shop-cta">
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Icon name="Storefront" />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onArticleShopOpen?.(activeArticle);
                  }}
                >
                  Où acheter
                </Button>
              </div>
            </footer>
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
                <dd>{formatOptionalCurrency(projectMetadata.budget)}</dd>
              </div>   
                      
            </dl>
            
          ) : (
            <p>Aucun projet sélectionné.</p>
          )}
        </section>
 <footer className="espacepro__rer">
              
                </footer>
      </aside>

      {isRecapOpen && (
        <div className="espacepro__recap-modal" role="dialog" aria-modal="true" aria-label="Récapitulatif PDF">
          <div className="espacepro__recap-card">
            <header className="espacepro__recap-header">
              <div>
                <span>Format PDF</span>
                <h2>Récapitulatif</h2>
              </div>
              <button type="button" aria-label="Fermer le récapitulatif" onClick={() => setIsRecapOpen(false)}>
                <Icon name="Close" size="sm" />
              </button>
            </header>

            <section className="espacepro__recap-content">
              <div className="espacepro__recap-summary">
                <div>
                  <span>Projet</span>
                  <strong>{selectedProject?.name || '-'}</strong>
                </div>
                <div>
                  <span>Type de pièce</span>
                  <strong>{projectMetadata.roomType}</strong>
                </div>
                <div>
                  <span>Budget cible</span>
                  <strong>{formatOptionalCurrency(projectMetadata.budget)}</strong>
                </div>
                <div>
                  <span>Simulation achat</span>
                  <strong>{formatCurrency(articleSimulation.total)}</strong>
                </div>
              </div>

              <table className="espacepro__recap-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Catégorie</th>
                    <th>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {recapRows.map((row, index) => (
                    <tr key={`${row.name}-${index}`}>
                      <td>{row.name}</td>
                      <td>{row.category}</td>
                      <td>{formatCurrency(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <footer className="espacepro__recap-footer">
              <span>Réf. #{getProjectReference(selectedProject)}</span>
              <button type="button" onClick={handleDownloadRecap} disabled={isRecapDownloading}>
                <Icon name="Download" size="sm" />
                {isRecapDownloading ? 'Génération...' : 'Exporter en PDF'}
              </button>
            </footer>
            {recapError && <Alert variant="danger" className="espacepro__recap-error">{recapError}</Alert>}
          </div>
        </div>
      )}
    </div>
  );
}
