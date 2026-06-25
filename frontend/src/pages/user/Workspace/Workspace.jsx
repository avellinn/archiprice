import './Workspace.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ModalBoutique from '../../../components/modalBoutique';
import Newproject from '../../../components/Newproject';
import { Alert, Button, Icon, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { upsertSupplierClientNotification } from '../../../services/clientNotifications';
import { createDemande } from '../../../services/demandes';
import { deleteProject, fetchProjects, updateProject } from '../../../services/projects';
import { isNumericOnly, sanitizeNumericInput } from '../../../utils/formInput';

const WORKSPACE_CARDS = [
  {
    id: 'create-project',
    title: 'Nouveau projet',
    action: 'Accéder',
    icon: 'Add',
    tone: 'blue',
    description: 'Commencez une nouvelle estimation budgétaire en quelques minutes.',
    intent: 'create',
  },
  {
    id: 'catalogue-projects',
    title: 'Projets récents',
    action: 'Accéder',
    icon: 'Explore',
    tone: 'orange',
    kind: 'projects',
  },
  {
    id: 'archives',
    title: 'Archives',
    action: 'Consulter',
    icon: 'ReceiptLong',
    tone: 'green',
    description:
      'Visualisez les archives créées après validation de vos projets.',
  },
  {
    id: 'purchase-travel',
    title: 'Où acheter',
    action: 'Accéder',
    icon: 'Workspaces',
    tone: 'red',
    description: 'Boutique recommandée',
    intent: 'shop',
  },
];

function parseAmount(value) {
  const amount = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function formatCurrency(value) {
  return formatFCFA(parseAmount(value));
}

function formatOptionalCurrency(value) {
  const amount = parseAmount(value);
  return amount > 0 ? formatFCFA(amount) : 'Budget non renseigné';
}

function getProjectShopSeed(project) {
  return String(project?.id || project?.name || '')
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getProjectRecommendedShops(project, shops) {
  if (!shops.length) return [];

  const startIndex = getProjectShopSeed(project) % shops.length;
  return [...shops.slice(startIndex), ...shops.slice(0, startIndex)].slice(0, Math.min(3, shops.length));
}

function getProductShopName(product) {
  const description = product?.description || '';
  const shopMatch = description.match(/Boutique\s*:\s*(.+)/i);
  return shopMatch?.[1]?.trim() || '';
}

function getDynamicProjectShops(project, products, shops) {
  const productShopNames = [...new Set(products.map(getProductShopName).filter(Boolean))];
  const matchedShops = productShopNames
    .map((shopName) => shops.find((shop) => shop.name.toLowerCase() === shopName.toLowerCase()))
    .filter(Boolean);

  if (matchedShops.length > 0) return matchedShops;

  return getProjectRecommendedShops(project, shops);
}

function getUserProfession(user) {
  return user?.profession
    || user?.type
    || user?.accountType
    || user?.role
    || 'Client';
}

function getArticleImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;

  return image.secure_url || image.url || '';
}

function getArticleCloudinaryLinks(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const normalizedImages = images
    .map((image) => ({
      name: product?.name || 'Article',
      secure_url: getArticleImageUrl(image),
      public_id: typeof image === 'object' ? image.public_id || '' : '',
    }))
    .filter((image) => image.secure_url);

  if (normalizedImages.length > 0) return normalizedImages;

  const singleImage = getArticleImageUrl(product?.image);
  return singleImage ? [{ name: product?.name || 'Article', secure_url: singleImage, public_id: '' }] : [];
}

function buildSupplierClientNotification({
  shop,
  user,
  project,
  simulation,
  products = [],
  message = '',
}) {
  const now = new Date().toISOString();
  const userId = user?.id || user?._id || user?.email || 'client';
  const supplierKey = shop?.id || shop?.name || 'boutique';

  return {
    id: `supplier-client-${supplierKey}-${userId}-${Date.now()}`,
    supplierId: shop?.id || '',
    supplierName: shop?.name || '',
    supplierContact: shop?.contact || '',
    clientId: user?.id || user?._id || '',
    clientName: user?.name || user?.fullName || user?.email || 'Client ArchiPrice',
    clientProfession: getUserProfession(user),
    clientEmail: user?.email || '',
    clientPhone: user?.phone || user?.telephone || user?.phoneNumber || 'Non renseigné',
    projectId: project?.id || '',
    projectName: project?.name || 'Projet sans nom',
    simulationTotal: simulation.total,
    simulationTotalLabel: formatCurrency(simulation.total),
    articleCount: simulation.count,
    categories: simulation.categories,
    articleImages: products.flatMap(getArticleCloudinaryLinks),
    selectedArticles: products.map((product) => ({
      id: product.id || product._id || '',
      name: product.name || 'Article sans nom',
      category: product.category || '',
      unitPrice: Number(product.unitPrice || 0),
      images: getArticleCloudinaryLinks(product),
    })),
    type: 'Demande',
    message,
    messages: message ? [
      {
        id: `message-${Date.now()}`,
        senderRole: 'user',
        senderName: user?.name || user?.fullName || user?.email || 'Client ArchiPrice',
        message,
        createdAt: now,
      },
    ] : [],
    status: 'Nouveau',
    createdAt: now,
  };
}

function normalizeRoomOptions(items = []) {
  return items
    .map((item) => item?.name || item?.label || item)
    .map((name) => String(name || '').trim())
    .filter(Boolean)
    .map((name) => ({ value: name, label: name }));
}

function extractEditableProjectData(project, roomOptions = []) {
  const description = project?.description || '';
  const roomMatch = description.match(/Type de pièce\s*:\s*(.+)/i);
  const budgetMatch = description.match(/Estimation budget\s*:\s*(.+)/i);
  const firstRoomType = roomOptions[0]?.value || '';
  const roomType = roomMatch?.[1]?.trim() || firstRoomType;
  const knownRoomType = roomOptions.some((type) => type.value === roomType)
    ? roomType
    : firstRoomType;

  return {
    name: project?.name || '',
    roomType: knownRoomType,
    budget: budgetMatch?.[1]?.trim() || '',
    budgetValue: budgetMatch?.[1] ? String(parseAmount(budgetMatch[1])) : '',
    status: project?.status || 'draft',
  };
}

function buildEditedProjectDescription(project, roomType, budget) {
  const formattedBudget = formatOptionalCurrency(budget);
  const preservedLines = (project?.description || '')
    .split('\n')
    .filter((line) => (
      !/^Type de pièce\s*:/i.test(line)
      && !/^Estimation budget\s*:/i.test(line)
    ));

  return [
    `Type de pièce : ${roomType}`,
    parseAmount(budget) > 0 ? `Estimation budget : ${formattedBudget}` : '',
    ...preservedLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function isActiveProject(project) {
  return !['archived', 'completed', 'done'].includes(String(project?.status || '').toLowerCase());
}

function getLatestActiveProject(projects = []) {
  return projects
    .filter(isActiveProject)
    .sort((left, right) => (
      new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)
    ))[0] || projects[0] || null;
}

function getShopDemandMessage({ shop, project, products = [] }) {
  const shopName = shop?.name || shop?.companyName || 'cette boutique';
  const projectName = project?.name || 'mon projet';
  const productCount = products.length;

  return productCount > 0
    ? `Demande boutique pour ${projectName}: ${productCount} article(s) sélectionné(s) chez ${shopName}.`
    : `Demande boutique pour ${projectName} chez ${shopName}.`;
}

export default function Workspace() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [adminData, updateAdminData] = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(() => searchParams.get('newProject') === '1');
  const [projects, setProjects] = useState([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isShopSelectorOpen, setIsShopSelectorOpen] = useState(false);
  const [selectedShopName, setSelectedShopName] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editStatus, setEditStatus] = useState('draft');
  const [editProjectError, setEditProjectError] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState('');
  const [pendingProjectDelete, setPendingProjectDelete] = useState(null);
  const [selectedProjectProducts] = useState([]);
  const [projectLaunchNotice, setProjectLaunchNotice] = useState('');
  const roomOptions = useMemo(() => (
    normalizeRoomOptions(adminData.taxonomies?.rooms || [])
  ), [adminData.taxonomies?.rooms]);

  const loadProjects = useCallback(() => {
    setIsProjectsLoading(true);

    fetchProjects()
      .then((list) => {
        setProjects(list);
        setProjectsError('');
        const projectIdFromUrl = searchParams.get('projectId');
        if (projectIdFromUrl) {
          setSelectedProjectId(projectIdFromUrl);
        }
      })
      .catch(() => {
        setProjects([]);
        setProjectsError('Impossible de charger les projets récents.');
      })
      .finally(() => setIsProjectsLoading(false));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (searchParams.get('mode') === 'projects' || projectIdFromUrl) {
      navigate(projectIdFromUrl ? `/espacepro?projectId=${projectIdFromUrl}` : '/espacepro', { replace: true });
    }
  }, [navigate, searchParams]);

  useRealtimeRefresh(loadProjects, ['projects', 'project-products']);

  const latestActiveProject = useMemo(() => getLatestActiveProject(projects), [projects]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || latestActiveProject;
  const workspaceSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const filteredProjects = useMemo(() => {
    if (!workspaceSearchTerm) return projects;

    return projects.filter((project) => (
      String(project.name || '').toLowerCase().includes(workspaceSearchTerm)
      || String(project.description || '').toLowerCase().includes(workspaceSearchTerm)
      || String(project.status || '').toLowerCase().includes(workspaceSearchTerm)
    ));
  }, [projects, workspaceSearchTerm]);
  const workspaceCards = useMemo(() => WORKSPACE_CARDS, []);
  const projectShops = useMemo(
    () => {
      const adminShops = (adminData.suppliers || [])
        .filter((supplier) => supplier.isRecommended)
        .map((supplier) => ({
          id: supplier.id,
          name: supplier.companyName || supplier.name,
          companyName: supplier.companyName || supplier.name,
          contact: supplier.contact || supplier.email || '',
          zone: supplier.region || supplier.zone || 'Zone non renseignée',
          categories: Array.isArray(supplier.categories) && supplier.categories.length > 0
            ? supplier.categories.join(', ')
            : supplier.products
              ? `${supplier.products} article(s) lié(s)`
              : 'Catégories configurées par l’admin',
          status: supplier.status,
          isRecommended: supplier.isRecommended,
        })).filter((supplier) => supplier.name);

      return getDynamicProjectShops(selectedProject, selectedProjectProducts, adminShops);
    },
    [adminData.suppliers, selectedProject, selectedProjectProducts],
  );
  const selectedShop = projectShops.find((shop) => shop.name === selectedShopName) || projectShops[0];
  const selectedProjectPurchaseSimulation = useMemo(() => {
    const activeProjectProducts = selectedProject ? selectedProjectProducts : [];
    const total = activeProjectProducts.reduce((sum, product) => sum + Number(product.unitPrice || 0), 0);
    const categories = [...new Set(activeProjectProducts.map((product) => product.category).filter(Boolean))];

    return {
      total,
      count: activeProjectProducts.length,
      categories,
    };
  }, [selectedProject, selectedProjectProducts]);
  function closeModal() {
    setIsModalOpen(false);
    setProjectLaunchNotice('');
    setSearchParams({}, { replace: true });
  }

  function handleProjectCreated(project) {
    if (project) {
      setProjects((currentProjects) => [
        project,
        ...currentProjects.filter((currentProject) => currentProject.id !== project.id),
      ]);
      setSelectedProjectId(project.id);
      setProjectsError('');
      setIsModalOpen(false);
      setProjectLaunchNotice('');
      if (project.id) {
        navigate(`/catalogue?projectId=${project.id}`, { state: { from: location } });
      }
      return;
    }
    closeModal();
  }

  function openEditProject(project) {
    if (project?.id) {
      navigate(`/catalogue?projectId=${project.id}&recap=1`, { state: { from: location } });
      return;
    }

    const editableProject = extractEditableProjectData(project, roomOptions);
    setEditingProject(project);
    setEditProjectName(editableProject.name);
    setEditRoomType(editableProject.roomType);
    setEditBudget(editableProject.budgetValue);
    setEditStatus(editableProject.status);
    setEditProjectError('');
  }

  function closeEditProject() {
    setEditingProject(null);
    setEditProjectError('');
    setIsUpdatingProject(false);
  }

  async function handleProjectUpdate(event) {
    event.preventDefault();

    if (!editingProject) return;

    const name = editProjectName.trim();
    if (!name) {
      setEditProjectError('Nom du projet requis');
      return;
    }

    if (isNumericOnly(name)) {
      setEditProjectError('Le nom du projet doit contenir du texte.');
      return;
    }

    if (!editRoomType) {
      setEditProjectError('Type de pièce requis');
      return;
    }

    setIsUpdatingProject(true);
    setEditProjectError('');

    try {
      const updatedProject = await updateProject(editingProject.id, {
        name,
        description: buildEditedProjectDescription(editingProject, editRoomType, editBudget.trim()),
        status: editStatus,
      });

      setProjects((currentProjects) => currentProjects.map((project) => (
        project.id === updatedProject.id ? updatedProject : project
      )));
      setSelectedProjectId(updatedProject.id);
      setProjectsError('');
      closeEditProject();
    } catch (error) {
      setEditProjectError(getApiErrorMessage(error, 'Impossible de modifier le projet'));
    } finally {
      setIsUpdatingProject(false);
    }
  }

  async function confirmProjectDelete() {
    const project = pendingProjectDelete;
    if (!project) return;

    setDeletingProjectId(project.id);
    setProjectsError('');
    setPendingProjectDelete(null);

    try {
      await deleteProject(project.id);
      setProjects((currentProjects) => {
        const nextProjects = currentProjects.filter((currentProject) => currentProject.id !== project.id);

        if (selectedProjectId === project.id) {
          setSelectedProjectId(nextProjects[0]?.id || '');
        }

        return nextProjects;
      });
    } catch (error) {
      setProjectsError(getApiErrorMessage(error, 'Impossible de supprimer le projet'));
    } finally {
      setDeletingProjectId('');
    }
  }

  function handleProjectDelete(project) {
    setPendingProjectDelete(project);
  }

  function handleCardAction(card) {
    if (card.id === 'archives') {
      navigate('/archives');
      return;
    }

    if (card.kind === 'projects') {
      navigate(latestActiveProject?.id ? `/espacepro?projectId=${latestActiveProject.id}` : '/espacepro');
      return;
    }

    if (card.intent === 'create') {
      setProjectLaunchNotice('');
      setIsModalOpen(true);
      return;
    }

    if (card.intent === 'shop') {
      const projectForShop = latestActiveProject || selectedProject;
      if (projectForShop?.id) {
        navigate(`/espacepro?projectId=${projectForShop.id}&shop=1`);
        return;
      }

      setProjectLaunchNotice('Lancez votre projet et découvrez les boutiques recommandées');
      setIsModalOpen(true);
      return;
    }
  }

  function handleCardKeyDown(event, card) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardAction(card);
    }
  }

  function handleRecentProjectClick(projectId) {
    navigate(`/espacepro?projectId=${projectId}`);
  }

  async function handleShopSelect(shop, message = '') {
    if (!shop?.name) return;

    setSelectedShopName(shop.name);
    const demandMessage = message.trim() || getShopDemandMessage({
      shop,
      project: selectedProject,
      products: selectedProjectProducts,
    });
    const notification = buildSupplierClientNotification({
      shop,
      user,
      project: selectedProject,
      simulation: selectedProjectPurchaseSimulation,
      products: selectedProjectProducts,
      message: demandMessage,
    });

    try {
      const demande = await createDemande({
        supplierId: shop.id || shop._id || '',
        supplierName: shop.name || shop.companyName || '',
        supplierContact: shop.contact || shop.email || '',
        projectId: selectedProject?.id || '',
        projectName: selectedProject?.name || '',
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

  function renderCardContent(card) {
    if (card.kind === 'projects') {
      if (projectsError) {
        return <Alert variant="danger">{projectsError}</Alert>;
      }

      if (filteredProjects.length === 0) {
        return <p>Aucun projet créé pour le moment.</p>;
      }

      return (
        <ul className="workspace-feature-card__list workspace-feature-card__list--scroll workspace-feature-card__project-list">
          {filteredProjects.map((project, index) => (
            <li className="workspace-feature-card__project-row" key={`${project.id || project.name}-${index}`}>
              <button
                type="button"
                className="workspace-feature-card__project-button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRecentProjectClick(project.id);
                }}
              >
                <span className="workspace-feature-card__project-icon" aria-hidden="true">
                  <Icon name="Folder" size="sm" />
                </span>
                <span>{project.name}</span>
              </button>
              <div className="workspace-feature-card__project-actions" aria-label={`Actions pour ${project.name}`}>
                <button
                  type="button"
                  aria-label={`Modifier ${project.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditProject(project);
                  }}
                >
                  <Icon name="Edit" size="sm" />
                </button>
                <button
                  type="button"
                  aria-label={`Supprimer ${project.name}`}
                  disabled={deletingProjectId === project.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleProjectDelete(project);
                  }}
                >
                  <Icon name="Delete" size="sm" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <>
        {card.heading && <h3>{card.heading}</h3>}
        {card.description && <p>{card.description}</p>}
        {card.items && (
          <ul className="workspace-feature-card__list">
            {card.items.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        )}
        {card.details && (
          <dl className="workspace-feature-card__details">
            {card.details.map(([label, value], index) => (
              <div key={`${label}-${index}`}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </>
    );
  }

  return (
    <div className="workspace-page">
      {isProjectsLoading && <Loader className="workspace-page__loader" />}
      {!isProjectsLoading && (
      <section className="workspace-hub" aria-label="Mon espace de travail">
        {pendingProjectDelete && (
          <Alert
            variant="warning"
            title="Suppression de projet"
            className="workspace-confirm-alert"
            onClose={() => setPendingProjectDelete(null)}
          >
            <span>Supprimer définitivement le projet "{pendingProjectDelete.name}" ?</span>
            <span className="workspace-confirm-alert__actions">
              <button type="button" onClick={() => setPendingProjectDelete(null)}>Annuler</button>
              <button type="button" onClick={confirmProjectDelete}>Supprimer</button>
            </span>
          </Alert>
        )}
          <div className="workspace-card-grid">
            {workspaceCards.map((card) => (
              <article
                className="workspace-feature-card workspace-feature-card--clickable"
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardAction(card)}
                onKeyDown={(event) => handleCardKeyDown(event, card)}
              >
                <div className="workspace-feature-card__top">
                  <h2>{card.title}</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Icon name="ArrowRight" size="sm" />}
                    iconPosition="right"
                    className="workspace-feature-card__action"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCardAction(card);
                    }}
                  >
                    {card.action}
                  </Button>
                </div>

                <div className="workspace-feature-card__body">
                  <div className="workspace-feature-card__visual" aria-hidden="true">
                    <span className="workspace-feature-card__screen">
                      <Icon name={card.icon} size="lg" />
                    </span>
                    <span className="workspace-feature-card__accent" />
                  </div>

                  <div className="workspace-feature-card__copy">
                    {renderCardContent(card)}
                  </div>
                </div>
              </article>
            ))}
          </div>
      </section>
      )}

      <Newproject
        isOpen={isModalOpen}
        onCancel={closeModal}
        onCreated={handleProjectCreated}
        roomTypes={roomOptions}
      />

      {isModalOpen && projectLaunchNotice && (
        <Alert
          variant="info"
          className="workspace-project-launch-alert"
          onClose={() => setProjectLaunchNotice('')}
        >
          {projectLaunchNotice}
        </Alert>
      )}

      <ModalBoutique
        isOpen={isShopSelectorOpen}
        shops={projectShops}
        selectedShopName={selectedShop?.name || selectedShopName}
        simulation={{
          totalLabel: formatCurrency(selectedProjectPurchaseSimulation.total),
          count: selectedProjectPurchaseSimulation.count,
          categories: selectedProjectPurchaseSimulation.categories,
        }}
        onClose={() => setIsShopSelectorOpen(false)}
        onSelectShop={handleShopSelect}
      />

      {editingProject && (
        <div className="modal-create-project__backdrop" role="presentation">
          <form
            className="modal-create-project"
            onSubmit={handleProjectUpdate}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-edit-project-title"
          >
            <div className="modal-create-project__header">
              <div>
                <span className="modal-create-project__eyebrow">Gestion projet</span>
                <h2 id="modal-edit-project-title">Modifier le projet</h2>
              </div>
              <button
                type="button"
                className="modal-create-project__close"
                onClick={closeEditProject}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="modal-create-project__fields">
              <label className="modal-create-project__field">
                Nom du projet
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(event) => setEditProjectName(event.target.value)}
                  maxLength={200}
                  autoFocus
                />
              </label>

              <label className="modal-create-project__field">
                Type de pièce
                <select value={editRoomType} onChange={(event) => setEditRoomType(event.target.value)}>
                  <option value="" disabled>Choisir une pièce</option>
                  {roomOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-create-project__field">
                Estimation budget (FCFA)
                <input
                  type="text"
                  value={editBudget}
                  onChange={(event) => setEditBudget(sanitizeNumericInput(event.target.value))}
                  inputMode="numeric"
                />
              </label>

              <label className="modal-create-project__field">
                Statut
                <select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
                  <option value="draft">Brouillon</option>
                  <option value="active">En cours</option>
                  <option value="archived">Terminé</option>
                </select>
              </label>
            </div>

            {editProjectError && (
              <Alert variant="danger" className="modal-create-project__error">{editProjectError}</Alert>
            )}

            <div className="modal-create-project__actions">
              <Button type="button" variant="danger" onClick={closeEditProject} disabled={isUpdatingProject}>
                Annuler
              </Button>
              <Button type="submit" variant="success" isLoading={isUpdatingProject} disabled={!editProjectName.trim()}>
                Modifier
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
