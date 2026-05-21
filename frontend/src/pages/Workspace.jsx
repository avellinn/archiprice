import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import EspacePro from '../components/espacepro';
import Icon from '../components/Icon';
import ModalCreateProject from '../components/ModalCreateProject';
import WorkspaceMiniGrid from '../components/WorkspaceMiniGrid';
import { fetchProjects } from '../services/projects';

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

export default function Workspace() {
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
  }, []);

  const workspaceCards = useMemo(
    () => WORKSPACE_CARDS.map((card) => {
      if (card.id !== 'purchase-travel') return card;

      return {
        ...card,
        details: isShopRevealed
          ? [
            ['Nom boutique', RECOMMENDED_SHOPS[0].name],
            ['Zone', RECOMMENDED_SHOPS[0].zone],
            ['Catégories disponibles', RECOMMENDED_SHOPS[0].categories],
          ]
          : null,
      };
    }),
    [isShopRevealed],
  );
  const activeCard = activeCardId
    ? workspaceCards.find((card) => card.id === activeCardId)
    : null;
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  const projectShops = useMemo(
    () => getProjectRecommendedShops(selectedProject, RECOMMENDED_SHOPS),
    [selectedProject],
  );
  const selectedShop = projectShops.find((shop) => shop.name === selectedShopName) || projectShops[0];

  function closeModal() {
    setIsModalOpen(false);
    setSearchParams({}, { replace: true });
  }

  function handleProjectCreated(project) {
    if (project) {
      setProjects((currentProjects) => [project, ...currentProjects]);
      setSelectedProjectId(project.id);
      setProjectsError('');
    }
    closeModal();
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

      if (projects.length === 0) {
        return <p>Aucun projet créé pour le moment.</p>;
      }

      return (
        <ul className="workspace-feature-card__list workspace-feature-card__list--scroll workspace-feature-card__project-list">
          {projects.map((project) => (
            <li key={project.id}>
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
            {card.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {card.details && (
          <dl className="workspace-feature-card__details">
            {card.details.map(([label, value]) => (
              <div key={label}>
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
            <WorkspaceMiniGrid
              cards={workspaceCards}
              activeCardId={activeCard.id}
              getMetric={getMiniCardMetric}
              onCardClick={handleMiniCardClick}
            />

            <EspacePro
              projects={projects}
              isProjectsLoading={isProjectsLoading}
              projectsError={projectsError}
              selectedProjectId={selectedProjectId}
              onProjectSelect={setSelectedProjectId}
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
                    <div className="workspace-shop-options" role="listbox" aria-label="Boutiques recommandées">
                      {projectShops.map((shop) => {
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
                            key={`${selectedProject?.id || 'project'}-${shop.name}`}
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
    </div>
  );
}
