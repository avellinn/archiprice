import './Workspace.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import EspacePro from '../../../components/espacepro';
import ModalCreateProject from '../../../components/ModalCreateProject';
import { Button, Icon } from '../../../components/ui';
import WorkspaceMiniGrid from '../../../components/WorkspaceMiniGrid';
import { getApiErrorMessage } from '../../../services/api';
import { deleteProject, fetchProjects, updateProject } from '../../../services/projects';

const RECOMMENDED_SHOPS = [
  {
    name: 'Archi Matériaux',
    zone: 'Cotonou - Akpakpa',
    categories: 'Ciment, peinture, plomberie, électricité',
  },
  {
    name: 'BatiPlus Déco',
    zone: 'Cotonou - Fidjrossè',
    categories: 'Carrelage, luminaires, peinture décorative',
  },
  {
    name: 'Maison Pro',
    zone: 'Abomey-Calavi',
    categories: 'Menuiserie, sanitaires, accessoires cuisine',
  },
  {
    name: 'Jardin & Terrasse',
    zone: 'Porto-Novo',
    categories: 'Revêtements extérieurs, plantes, mobilier jardin',
  },
];

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
    id: 'invoices',
    title: 'Documents exportés',
    action: 'Consulter',
    icon: 'ReceiptLong',
    tone: 'green',
    description:
      'Visualisez les documents exportés liés à vos projets et gardez une vue claire sur les coûts engagés.',
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

const EDIT_ROOM_TYPES = [
  { value: 'salon', label: 'Salon' },
  { value: 'chambre', label: 'Chambre' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'douche', label: 'Douche' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'espace externe', label: 'Espace externe' },
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
  const matchedShops = productShopNames.map((shopName) => {
    const knownShop = shops.find((shop) => shop.name.toLowerCase() === shopName.toLowerCase());

    return knownShop || {
      name: shopName,
      zone: 'Zone à confirmer',
      categories: 'Articles sélectionnés pour ce projet',
    };
  });

  if (matchedShops.length > 0) return matchedShops;

  return getProjectRecommendedShops(project, shops);
}

function extractEditableProjectData(project) {
  const description = project?.description || '';
  const roomMatch = description.match(/Type de pièce\s*:\s*(.+)/i);
  const budgetMatch = description.match(/Estimation budget\s*:\s*(.+)/i);
  const roomType = roomMatch?.[1]?.trim().toLowerCase() || EDIT_ROOM_TYPES[0].value;
  const knownRoomType = EDIT_ROOM_TYPES.some((type) => type.value === roomType)
    ? roomType
    : EDIT_ROOM_TYPES[0].value;

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(() => searchParams.get('newProject') === '1');
  const [projects, setProjects] = useState([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isShopRevealed, setIsShopRevealed] = useState(false);
  const [isShopSelectorOpen, setIsShopSelectorOpen] = useState(false);
  const [selectedShopName, setSelectedShopName] = useState('');
  const [activeCardId, setActiveCardId] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editRoomType, setEditRoomType] = useState(EDIT_ROOM_TYPES[0].value);
  const [editBudget, setEditBudget] = useState('');
  const [editStatus, setEditStatus] = useState('draft');
  const [editProjectError, setEditProjectError] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState('');
  const [selectedProjectProducts, setSelectedProjectProducts] = useState([]);
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
      recommendedShops: RECOMMENDED_SHOPS.length,
    };
  }, [projects]);

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
  const workspaceCards = useMemo(
    () => WORKSPACE_CARDS.map((card) => {
      if (card.id !== 'purchase-travel') return card;

      const simulationTotal = selectedProjectProducts.reduce(
        (total, product) => total + Number(product.unitPrice || 0),
        0,
      );

      return {
        ...card,
        details: isShopRevealed
          ? [
            ['Projet', selectedProject?.name || 'Aucun projet'],
            ['Articles sélectionnés', selectedProjectProducts.length],
            ['Simulation achat', formatCurrency(simulationTotal)],
          ]
          : null,
      };
    }),
    [isShopRevealed, selectedProject?.name, selectedProjectProducts],
  );
  const activeCard = activeCardId
    ? workspaceCards.find((card) => card.id === activeCardId)
    : null;
  const projectShops = useMemo(
    () => getDynamicProjectShops(selectedProject, selectedProjectProducts, RECOMMENDED_SHOPS),
    [selectedProject, selectedProjectProducts],
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
      navigate(`/catalogue?projectId=${project.id}`, { state: { from: location } });
      return;
    }
    closeModal();
  }

  function openEditProject(project) {
    const editableProject = extractEditableProjectData(project);
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

  async function handleProjectDelete(project) {
    const shouldDelete = window.confirm(`Supprimer définitivement le projet "${project.name}" ?`);
    if (!shouldDelete) return;

    setDeletingProjectId(project.id);
    setProjectsError('');

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

  function handleCardAction(card) {
    if (card.intent === 'create') {
      setIsModalOpen(true);
      return;
    }

    setActiveCardId(card.id);

    if (card.intent === 'shop') {
      setIsShopRevealed(true);
      setIsShopSelectorOpen(true);
    }
  }

  function handleMiniCardClick(card) {
    if (card.intent === 'create') {
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

    if (card.id === 'invoices') {
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
        return <p>Chargement des projets...</p>;
      }

      if (projectsError) {
        return <p>{projectsError}</p>;
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
            />

            <div className="workspace-shop-cta">
              {isShopSelectorOpen && (
                <div className="workspace-shop-popover" role="dialog" aria-label="Choisir une boutique">
                  <div className="workspace-shop-popover__header">
                    <h2>Choisir une boutique</h2>
                    <button
                      type="button"
                      aria-label="Fermer la sélection des boutiques"
                      onClick={() => setIsShopSelectorOpen(false)}
                    >
                      <Icon name="Close" size="sm" />
                    </button>
                  </div>

                  {projectShops.length === 0 ? (
                    <p>Aucune boutique recommandée pour ce projet.</p>
                  ) : (
                    <>
                      <div className="workspace-shop-simulation">
                        <strong>{formatCurrency(selectedProjectPurchaseSimulation.total)}</strong>
                        <span>
                          {selectedProjectPurchaseSimulation.count} article(s)
                          {selectedProjectPurchaseSimulation.categories.length > 0
                            ? ` · ${selectedProjectPurchaseSimulation.categories.join(', ')}`
                            : ''}
                        </span>
                      </div>

                      <div className="workspace-shop-options" role="listbox" aria-label="Boutiques recommandées">
                        {projectShops.map((shop, index) => {
                          const isSelected = selectedShop?.name === shop.name;

                          return (
                            <button
                              type="button"
                              className={[
                                'workspace-shop-option',
                                isSelected ? 'workspace-shop-option--selected' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              key={`${selectedProject?.id || 'project'}-${shop.name}-${index}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => setSelectedShopName(shop.name)}
                            >
                              <strong>{shop.name}</strong>
                              <span>{shop.zone}</span>
                              <small>{shop.categories}</small>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                size="lg"
                icon={<Icon name="Storefront" />}
                onClick={() => setIsShopSelectorOpen((isOpen) => !isOpen)}
              >
                Où acheter
              </Button>
            </div>
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

      <ModalCreateProject
        isOpen={isModalOpen}
        onCancel={closeModal}
        onCreated={handleProjectCreated}
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
                  {EDIT_ROOM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-create-project__field">
                Estimation budget (FCFA)
                <input
                  type="number"
                  value={editBudget}
                  onChange={(event) => setEditBudget(event.target.value)}
                  min="0"
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
              <p className="modal-create-project__error">{editProjectError}</p>
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
