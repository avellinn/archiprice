import './Workspace.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import EspacePro from '../../../components/espacepro';
import ModalBoutique from '../../../components/modalBoutique';
import Newproject from '../../../components/Newproject';
import { Alert, Button, Icon, Loader } from '../../../components/ui';
import WorkspaceMiniGrid from '../../../components/WorkspaceMiniGrid';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
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

function isFinished(project) {
  return ['archived', 'completed', 'done'].includes(project.status);
}

function getProjectExportedEstimateCount(project) {
  const numericFields = [
    'exportedEstimatesCount',
    'exportedEstimationsCount',
    'estimationExportsCount',
    'exportedDocumentsCount',
    'exportsCount',
  ];

  const countFromNumber = numericFields.find((field) => Number.isFinite(Number(project[field])));
  if (countFromNumber) return Number(project[countFromNumber]);

  const arrayFields = ['exportedEstimates', 'exportedEstimations', 'estimationExports', 'exportedDocuments', 'exports'];
  const countFromArray = arrayFields.find((field) => Array.isArray(project[field]));
  if (countFromArray) return project[countFromArray].length;

  return project.isEstimateExported || project.hasExportedEstimate ? 1 : 0;
}

function getPercent(value, total) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

function formatTrend(value) {
  if (!value) return '0.00%';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

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
  const [activeCardId, setActiveCardId] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editStatus, setEditStatus] = useState('draft');
  const [editProjectError, setEditProjectError] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState('');
  const [pendingProjectDelete, setPendingProjectDelete] = useState(null);
  const [selectedProjectProducts, setSelectedProjectProducts] = useState([]);
  const [projectLaunchNotice, setProjectLaunchNotice] = useState('');
  const workspaceStats = useMemo(() => {
    const completed = projects.filter(isFinished).length;
    const active = Math.max(projects.length - completed, 0);
    const exportedEstimates = projects.reduce(
      (total, project) => total + getProjectExportedEstimateCount(project),
      0,
    );

    return {
      totalProjects: projects.length,
      activeProjects: active,
      exportedEstimates,
      recommendedShops: (adminData.suppliers || []).filter((supplier) => supplier.isRecommended).length,
    };
  }, [adminData.suppliers, projects]);
  const roomOptions = useMemo(() => (
    normalizeRoomOptions(adminData.taxonomies?.rooms || [])
  ), [adminData.taxonomies?.rooms]);

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((list) => {
        if (!cancelled) {
          setProjects(list);
          setProjectsError('');
          const projectIdFromUrl = searchParams.get('projectId');
          if (projectIdFromUrl) {
            setSelectedProjectId(projectIdFromUrl);
          }
          if (searchParams.get('mode') === 'projects' || projectIdFromUrl) {
            setActiveCardId('catalogue-projects');
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          setProjectsError('Impossible de charger les projets récents.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsProjectsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
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
  const activeCard = activeCardId
    ? workspaceCards.find((card) => card.id === activeCardId)
    : null;
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
  const handleProductsChange = useCallback((products) => {
    setSelectedProjectProducts(products);
  }, []);

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
      navigate(`/catalogue?projectId=${project.id}`, { state: { from: location } });
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

        if (nextProjects.length === 0) {
          setActiveCardId('');
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

    if (card.intent === 'create') {
      setProjectLaunchNotice('');
      setIsModalOpen(true);
      return;
    }

    if (card.intent === 'shop') {
      setProjectLaunchNotice('Lancez votre projet et découvrez les boutiques recommandées');
      setIsModalOpen(true);
      return;
    }

    setActiveCardId(card.id);
  }

  function handleMiniCardClick(card) {
    if (card.intent === 'create') {
      setProjectLaunchNotice('');
      setIsModalOpen(true);
      return;
    }

    handleCardAction(card);
  }

  function handleBackToCards() {
    setActiveCardId('');
    setIsShopSelectorOpen(false);
  }

  function handleCardKeyDown(event, card) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardAction(card);
    }
  }

  function handleRecentProjectClick(projectId) {
    setSelectedProjectId(projectId);
    setActiveCardId('catalogue-projects');
  }

  function handleShopSelect(shop, message = '') {
    if (!shop?.name) return;

    setSelectedShopName(shop.name);
    const notification = buildSupplierClientNotification({
      shop,
      user,
      project: selectedProject,
      simulation: selectedProjectPurchaseSimulation,
      products: selectedProjectProducts,
      message,
    });

    updateAdminData((currentData) => ({
      ...currentData,
      supplierClientNotifications: [
        notification,
        ...(currentData.supplierClientNotifications || []),
      ],
    }));
  }

  function getMiniCardMetric(card) {
    const totalProjects = workspaceStats.totalProjects;

    if (card.id === 'create-project') {
      return {
        value: workspaceStats.totalProjects,
        trend: formatTrend(getPercent(workspaceStats.totalProjects, Math.max(totalProjects, 1))),
      };
    }

    if (card.id === 'catalogue-projects') {
      return {
        value: workspaceStats.activeProjects,
        trend: formatTrend(getPercent(workspaceStats.activeProjects, totalProjects)),
      };
    }

    if (card.id === 'archives') {
      return {
        value: workspaceStats.exportedEstimates,
        trend: formatTrend(getPercent(workspaceStats.exportedEstimates, Math.max(totalProjects, workspaceStats.exportedEstimates))),
      };
    }

    return {
      value: workspaceStats.recommendedShops,
      trend: formatTrend(getPercent(workspaceStats.recommendedShops, Math.max(workspaceStats.recommendedShops, 1))),
    };
  }

  function renderCardContent(card) {
    if (card.kind === 'projects') {
      if (isProjectsLoading) {
        return <Loader label="Chargement des projets..." />;
      }

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
      <section className="workspace-hub" aria-label="Mon espace de travail">
        {activeCard ? (
          <>
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
            <button
              type="button"
              className="workspace-back-button"
              aria-label="Retour aux cartes"
              onClick={handleBackToCards}
            >
              <Icon name="ArrowLeft" size="sm" />
            </button>

            <WorkspaceMiniGrid
              cards={workspaceCards}
              activeCardId={activeCard.id}
              getMetric={getMiniCardMetric}
              onCardClick={handleMiniCardClick}
            />

            <EspacePro
              projects={filteredProjects}
              isProjectsLoading={isProjectsLoading}
              projectsError={projectsError}
              selectedProjectId={selectedProjectId}
              onProjectSelect={setSelectedProjectId}
              onProjectEdit={openEditProject}
              onProjectDelete={handleProjectDelete}
              deletingProjectId={deletingProjectId}
              onProductsChange={handleProductsChange}
              onArticleShopOpen={() => setIsShopSelectorOpen(true)}
            />

          </>
        ) : (
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
        )}
      </section>

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
