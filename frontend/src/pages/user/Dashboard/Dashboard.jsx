import './Dashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import {
  fetchExportedDocuments,
  subscribeExportedDocumentsChange,
} from '../../../services/exportedDocuments';
import { fetchProjects } from '../../../services/projects';

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

function buildMonthActivity(items = []) {
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (7 - index));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthItems = items.filter((item) => {
      const itemDate = new Date(item.exportedAt || item.createdAt || item.updatedAt || item.date);
      if (Number.isNaN(itemDate.getTime())) return false;
      return itemDate.getFullYear() === date.getFullYear() && itemDate.getMonth() === date.getMonth();
    });

    return {
      key: monthKey,
      label: monthFormatter.format(date).replace('.', ''),
      count: monthItems.length,
      items: monthItems,
    };
  });
}

function buildActivityPath(activity = []) {
  const maxCount = Math.max(...activity.map((item) => item.count), 1);
  const points = activity.map((item, index) => {
    const x = 30 + ((364 / Math.max(activity.length - 1, 1)) * index);
    const y = 162 - ((item.count / maxCount) * 124);
    return { ...item, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  const fillPath = `${linePath} L394 184 L30 184 Z`;

  return { points, linePath, fillPath };
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
  const [exportedDocuments, setExportedDocuments] = useState(() => fetchExportedDocuments());

  const loadProjects = useCallback(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useRealtimeRefresh(loadProjects, ['projects', 'project-products']);

  useEffect(() => subscribeExportedDocumentsChange(setExportedDocuments), []);

  const stats = useMemo(() => {
    const finishedProjects = projects.filter(isFinished).length;
    const active = Math.max(projects.length - finishedProjects, 0);
    const processed = projects.filter((project) => project.status !== 'draft').length;
    const projectExportedEstimates = projects.reduce(
      (total, project) => total + getProjectExportedEstimateCount(project),
      0,
    );
    const exportedEstimates = Math.max(projectExportedEstimates, exportedDocuments.length);

    return {
      total: projects.length,
      active,
      archived: exportedEstimates,
      processed: Math.max(processed, exportedEstimates),
      exportedEstimates,
    };
  }, [exportedDocuments.length, projects]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = projects
    .filter((project) => (
      !dashboardSearchTerm
      || String(project.name || '').toLowerCase().includes(dashboardSearchTerm)
      || String(project.status || '').toLowerCase().includes(dashboardSearchTerm)
    ))
    .slice(0, 4);
  const monthActivity = buildMonthActivity(exportedDocuments);
  const activityChart = buildActivityPath(monthActivity);
  const repartitionData = [
    {
      name: 'Projets en cours',
      value: stats.active,
      chartValue: getDonutDisplayValue(stats.active, stats.total),
      percent: getPercent(stats.active, stats.total),
      color: '#5877f7',
    },
    {
      name: 'Archives',
      value: stats.archived,
      chartValue: getDonutDisplayValue(stats.archived, Math.max(stats.total, stats.archived)),
      percent: getPercent(stats.archived, Math.max(stats.total, stats.archived)),
      color: '#ffc865',
      unit: 'archive',
    },
    {
      name: 'Projets traités',
      value: stats.processed,
      chartValue: getDonutDisplayValue(stats.processed, Math.max(stats.total, stats.processed)),
      percent: getPercent(stats.processed, Math.max(stats.total, stats.processed)),
      color: '#22c55e',
    },
    {
      name: 'Total projets',
      value: stats.total,
      chartValue: getDonutDisplayValue(stats.total, stats.total),
      percent: stats.total ? 100 : 0,
      color: '#1d0870',
    },
    
  ];

  function openProject(project) {
    if (!project?.id) {
      navigate('/workspace?mode=projects');
      return;
    }

    navigate(`/workspace?projectId=${encodeURIComponent(project.id)}&mode=projects`);
  }

  function handleStatKeyDown(event, route) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigate(route);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-grid">
        <section id="processed-projects" className="dashboard-stats" aria-label="Résumé des projets">
          <article
            className="stat-card stat-blue stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/workspace?status=active')}
            onKeyDown={(event) => handleStatKeyDown(event, '/workspace?status=active')}
          >
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

          <article
            className="stat-card stat-yellow stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/archives')}
            onKeyDown={(event) => handleStatKeyDown(event, '/archives')}
          >
            <Text as="span" variant="bold" size="sm">
              Projets archives
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.archived).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 24 C18 12 24 22 35 18 S50 29 74 7" />
            </svg>
          </article>

          <article
            className="stat-card stat-red stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/workspace?status=processed')}
            onKeyDown={(event) => handleStatKeyDown(event, '/workspace?status=processed')}
          >
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

          <article
            className="stat-card stat-cyan stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/workspace?mode=projects')}
            onKeyDown={(event) => handleStatKeyDown(event, '/workspace?mode=projects')}
          >
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
                d={activityChart.fillPath}
              />
              <path
                className="chart-line"
                d={activityChart.linePath}
              />
              {activityChart.points.map((point) => (
                <circle
                  key={point.key}
                  cx={point.x}
                  cy={point.y}
                  r={point.count ? 5 : 3}
                />
              ))}
            </svg>
            <div className="chart-axis">
              {monthActivity.map((item) => (
                <Text as="span" size="sm" key={item.key}>
                  {item.label}
                </Text>
              ))}
            </div>
            <div className="chart-legend">
              
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> simulations exportées</Text>
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
                  <button type="button" onClick={() => openProject(project)}>
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
                  </button>
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
