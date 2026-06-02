import './Dashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import { fetchProjects } from '../../../services/projects';

const MONTH_ACTIVITY = [
  { label: 'Jan', value: 18 },
  { label: 'Fév', value: 30 },
  { label: 'Mar', value: 22 },
  { label: 'Avr', value: 47 },
  { label: 'Mai', value: 38 },
  { label: 'Juin', value: 62 },
  { label: 'Juil', value: 55 },
  { label: 'Août', value: 76 },
];

const STATUS_COPY = {
  draft: 'Brouillon',
  active: 'En cours',
  archived: 'Terminé',
  completed: 'Terminé',
  done: 'Terminé',
};

function isFinished(project) {
  return ['archived', 'completed', 'done'].includes(project.status);
}

function formatDate(value) {
  if (!value) return 'Date non renseignée';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getDonutDisplayValue(value, total) {
  if (!total) return 0;
  return value > 0 ? value : Math.max(total * 0.04, 0.08);
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const completed = projects.filter(isFinished).length;
    const active = Math.max(projects.length - completed, 0);
    const processed = projects.filter((project) => project.status !== 'draft').length;
    const exportedEstimates = projects.reduce(
      (total, project) => total + getProjectExportedEstimateCount(project),
      0,
    );

    return {
      total: projects.length,
      active,
      completed,
      processed,
      exportedEstimates,
    };
  }, [projects]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = projects
    .filter((project) => (
      !dashboardSearchTerm
      || String(project.name || '').toLowerCase().includes(dashboardSearchTerm)
      || String(project.status || '').toLowerCase().includes(dashboardSearchTerm)
    ))
    .slice(0, 4);
  const repartitionData = [
    {
      name: 'Projets en cours',
      value: stats.active,
      chartValue: getDonutDisplayValue(stats.active, stats.total),
      percent: getPercent(stats.active, stats.total),
      color: '#5877f7',
    },
    {
      name: 'Projets terminés',
      value: stats.completed,
      chartValue: getDonutDisplayValue(stats.completed, stats.total),
      percent: getPercent(stats.completed, stats.total),
      color: '#ffc865',
    },
    {
      name: 'Projets traités',
      value: stats.processed,
      chartValue: getDonutDisplayValue(stats.processed, stats.total),
      percent: getPercent(stats.processed, stats.total),
      color: '#22c55e',
    },
    {
      name: 'Total projets',
      value: stats.total,
      chartValue: getDonutDisplayValue(stats.total, stats.total),
      percent: stats.total ? 100 : 0,
      color: '#1d0870',
    },
    {
      name: 'Estimations exportées',
      value: stats.exportedEstimates,
      chartValue: stats.exportedEstimates,
      percent: getPercent(stats.exportedEstimates, Math.max(stats.total, stats.exportedEstimates)),
      color: '#c0893f',
      unit: 'estimation',
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-grid">
        <section id="processed-projects" className="dashboard-stats" aria-label="Résumé des projets">
          <article className="stat-card stat-blue">
            <Text as="span" variant="bold" size="sm">
              Projets en cours
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.active).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 23 C16 10 22 30 35 16 S58 6 74 10" />
            </svg>
          </article>

          <article className="stat-card stat-yellow">
            <Text as="span" variant="bold" size="sm">
              Projets terminés
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.completed).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 24 C18 12 24 22 35 18 S50 29 74 7" />
            </svg>
          </article>

          <article className="stat-card stat-red">
            <Text as="span" variant="bold" size="sm">
              Projets traités
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.processed).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 22 C13 17 19 27 30 20 S46 10 55 19 S66 9 74 13" />
            </svg>
          </article>

          <article className="stat-card stat-cyan">
            <Text as="span" variant="bold" size="sm">
              Total projets
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.total).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 21 C18 20 17 12 29 13 S39 25 50 20 S58 6 74 16" />
            </svg>
          </article>
        </section>

        <section className="dashboard-panel activity-panel">
          <div className="panel-heading">
            <h1>Activité des projets</h1>
            <Text as="span" variant="bold" size="sm">
              Chiffrage vs validation
            </Text>
          </div>
          <div className="line-chart" aria-label="Graphique d'activité mensuelle">
            <svg viewBox="0 0 420 210" role="img">
              <defs>
                <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffac4a" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#ffac4a" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                className="chart-fill"
                d="M30 162 C55 78 86 120 112 118 S150 146 178 75 S225 116 252 58 S300 106 329 42 S376 104 394 18 L394 184 L30 184 Z"
              />
              <path
                className="chart-line"
                d="M30 162 C55 78 86 120 112 118 S150 146 178 75 S225 116 252 58 S300 106 329 42 S376 104 394 18"
              />
              <circle cx="112" cy="118" r="5" />
              <circle cx="329" cy="42" r="5" />
            </svg>
            <div className="chart-axis">
              {MONTH_ACTIVITY.map((item, index) => (
                <Text as="span" size="sm" key={`${item.label}-${index}`}>
                  {item.label}
                </Text>
              ))}
            </div>
            <div className="chart-legend">
              <Text as="span" variant="bold" size="sm"><i className="legend-blue" /> Chiffrage</Text>
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> Validation</Text>
            </div>
          </div>
        </section>

        <section id="project-history" className="dashboard-panel history-panel">
          <div className="panel-heading row-heading">
            <h2>Projets récents</h2>
            <Text as="span" variant="bold" size="sm">
              Filtrer par date : Tout
            </Text>
          </div>
          {history.length === 0 ? (
            <Text className="muted history-empty">Aucun projet enregistré pour le moment.</Text>
          ) : (
            <ul className="history-list">
              {history.map((project, index) => (
                <li key={`${project.id || project.name}-${index}`}>
                  <span className={`history-icon history-icon-${index + 1}`} aria-hidden="true" />
                  <div>
                    <Text as="strong" variant="bold" size="sm">
                      {project.name}
                    </Text>
                    <Text as="span" variant="bold" size="sm">
                      {STATUS_COPY[project.status] ?? project.status} ·{' '}
                      {formatDate(project.updatedAt || project.createdAt)}
                    </Text>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="project-quotes" className="dashboard-panel repartition-panel">
          <DonutChartCard title="Répartition" data={repartitionData} />
        </section>

      </div>
      <div className="dashboard-new-project">
        <Button
          type="button"
          size="lg"
          icon={<Icon name="Add" />}
          onClick={() => navigate('/workspace?newProject=1')}
        >
          Nouveau projet
        </Button>
      </div>
    </div>
  );
}
