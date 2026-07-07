import './Dashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { fetchProjects, subscribeProjectsChange } from '../../../services/projects';
import { fetchMySimulationExports, fetchSimulationExportCount } from '../../../services/simulationExports';

const STATUS_COPY = {
  draft: 'Brouillon',
  active: 'En cours',
  treated: 'Traité',
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
  // Axe fixe : janvier → décembre de l'année courante.
  // Les mois futurs sont affichés mais marqués isFuture — pas de données.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(currentYear, index, 1);
    const targetMonth = index;
    const monthKey = `${currentYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const isFuture = targetMonth > currentMonth;

    const monthItems = isFuture ? [] : items.filter((item) => {
      const itemDate = new Date(item.exportedAt || item.createdAt);
      if (Number.isNaN(itemDate.getTime())) return false;
      return itemDate.getFullYear() === currentYear && itemDate.getMonth() === targetMonth;
    });

    return {
      key: monthKey,
      label: monthFormatter.format(date).replace('.', ''),
      count: monthItems.length,
      isFuture,
      items: monthItems,
    };
  });
}

function buildActivityPath(activity = []) {
  const nonZeroCounts = activity.map((item) => item.count).filter((c) => c > 0);

  // Échelle logarithmique : 1 export déjà visible, 100 proportionnel.
  const maxCount = nonZeroCounts.length > 0 ? Math.max(...nonZeroCounts) : 1;
  const logMax = Math.log10(maxCount + 1);

  const FLOOR_Y = 162;
  const CHART_HEIGHT = 120;

  const points = activity.map((item, index) => {
    const x = 30 + ((364 / Math.max(activity.length - 1, 1)) * index);
    const y = item.count === 0 || item.isFuture
      ? FLOOR_Y
      : FLOOR_Y - ((Math.log10(item.count + 1) / logMax) * CHART_HEIGHT);
    return { ...item, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const pastPoints = points.filter((p) => !p.isFuture);

  if (pastPoints.length === 0) {
    return { points, linePath: '', fillPath: '' };
  }

  let linePath = '';
  let fillPath = '';
  let segmentPoints = [];

  function flushSegment() {
    if (segmentPoints.length === 0) return;

    if (segmentPoints.length === 1) {
      // Un seul point actif : ligne verticale du plancher jusqu'au pic
      const p = segmentPoints[0];
      linePath += (linePath ? ' ' : '') + `M${p.x} ${FLOOR_Y} L${p.x} ${p.y}`;
      fillPath += (fillPath ? ' ' : '') + `M${p.x} ${FLOOR_Y} L${p.x} ${p.y} L${p.x + 0.1} ${p.y} L${p.x + 0.1} ${FLOOR_Y} Z`;
    } else {
      // Plusieurs points actifs consécutifs : courbe normale
      const seg = segmentPoints.map((sp, si) => `${si === 0 ? 'M' : 'L'}${sp.x} ${sp.y}`).join(' ');
      linePath += (linePath ? ' ' : '') + seg;
      fillPath += (fillPath ? ' ' : '')
        + `${seg} L${segmentPoints.at(-1).x} ${FLOOR_Y} L${segmentPoints[0].x} ${FLOOR_Y} Z`;
    }

    segmentPoints = [];
  }

  for (const p of pastPoints) {
    if (p.count > 0) {
      segmentPoints.push(p);
    } else {
      flushSegment();
    }
  }

  flushSegment();

  return { points, linePath, fillPath };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [simulationCount, setSimulationCount] = useState(0);
  const [simulations, setSimulations] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const loadDashboardData = useCallback(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
    fetchSimulationExportCount()
      .then(setSimulationCount)
      .catch(() => setSimulationCount(0));
    fetchMySimulationExports()
      .then(setSimulations)
      .catch(() => setSimulations([]));
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useRealtimeRefresh(loadDashboardData, ['projects', 'project-products', 'simulation-exports']);
  useEffect(() => subscribeProjectsChange(loadDashboardData), [loadDashboardData]);

  const stats = useMemo(() => {
    const treatedProjects = projects.filter((project) => project.status === 'treated').length;
    const archivedProjects = projects.filter(isFinished).length;
    const active = Math.max(projects.length - archivedProjects - treatedProjects, 0);

    return {
      total: projects.length,
      active,
      archived: archivedProjects,       // projets réellement archivés (status archived/completed/done)
      processed: treatedProjects,        // projets traités
      exportedEstimates: simulationCount, // exports PDF (pour la légende du graphique)
    };
  }, [simulationCount, projects]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = projects
    .filter((project) => (
      !dashboardSearchTerm
      || String(project.name || '').toLowerCase().includes(dashboardSearchTerm)
      || String(project.status || '').toLowerCase().includes(dashboardSearchTerm)
    ))
    .slice(0, 4);

  // Graphique : source unique = SimulationExport (exportedAt).
  // Le chart-line représente exclusivement les exports PDF réels.
  // Si la collection est vide, tous les mois affichent 0 — c'est correct.
  // On n'injecte plus projects ni demandes pour ne pas afficher de fausse activité.
  const allActivityItems = useMemo(() => simulations.map((s) => ({
    exportedAt: s.exportedAt,
    createdAt: s.createdAt,
  })), [simulations]);

  const monthActivity = buildMonthActivity(allActivityItems);
  const activityChart = buildActivityPath(monthActivity);

  // Légende : détail par source pour le mois courant
  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const currentMonthSimulations = simulations.filter((s) => {
    const d = new Date(s.exportedAt || s.createdAt || s.date);
    return !Number.isNaN(d.getTime())
      && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
  }).length;
  const repartitionData = [

    {
      name: 'Total projets',
      value: stats.total,
      chartValue: getDonutDisplayValue(stats.total, stats.total),
      percent: stats.total ? 100 : 0,
      color: '#1d0870',
    },


    {
      name: 'Projets traités',
      value: stats.processed,
      chartValue: getDonutDisplayValue(stats.processed, Math.max(stats.total, stats.processed)),
      percent: getPercent(stats.processed, Math.max(stats.total, stats.processed)),
      color: '#22c55e',
    },
    {
      name: 'Projets en cours',
      value: stats.active,
      chartValue: getDonutDisplayValue(stats.active, stats.total),
      percent: getPercent(stats.active, stats.total),
      color: '#5877f7',
    },
    
    
    

    {
      name: 'Simulations exportées',
      value: stats.exportedEstimates,
      chartValue: getDonutDisplayValue(stats.exportedEstimates, Math.max(stats.total, stats.exportedEstimates)),
      percent: getPercent(stats.exportedEstimates, Math.max(stats.total, stats.exportedEstimates)),
      color: '#ffc865',
      unit: 'export',
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
              Simulations exportées
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.exportedEstimates).padStart(2, '0')}
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
            <h1>Fréquence des projets exportés</h1>
            
          </div>
          <div className="line-chart" aria-label="Graphique d'activité mensuelle">
            <svg
              viewBox="0 0 420 210"
              role="img"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffac4a" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#ffac4a" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              <path className="chart-fill" d={activityChart.fillPath} />
              <path className="chart-line" d={activityChart.linePath} />

              {/* Zones de survol — déclenchent le tooltip sur tous les mois passés, même à count=0 */}
              {activityChart.points.map((point) => (
                <g
                  key={point.key}
                  onMouseEnter={() => !point.isFuture && setHoveredPoint(point)}
                >
                  <rect
                    x={point.x - 14}
                    y={20}
                    width={28}
                    height={164}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.count > 0 ? 5 : 3}
                    opacity={point.isFuture ? 0.18 : point.count > 0 ? 1 : 0.45}
                  />
                </g>
              ))}

              {/* Tooltip : mois + compteur — visible pour tous les mois passés (count=0 inclus) */}
              {hoveredPoint && (() => {
                const now = new Date();
                const currentYear = now.getFullYear();
                const monthLabel = hoveredPoint.label
                  ? `${hoveredPoint.label} ${currentYear}`
                  : hoveredPoint.key || '';
                const countLabel = hoveredPoint.count > 0
                  ? `${hoveredPoint.count} export${hoveredPoint.count > 1 ? 's' : ''}`
                  : 'Aucun export';

                const tooltipWidth = Math.max(monthLabel.length, countLabel.length) * 7 + 20;
                const tooltipHeight = 38;
                const anchorY = hoveredPoint.count > 0 ? hoveredPoint.y : 162;
                const tx = Math.min(Math.max(hoveredPoint.x - tooltipWidth / 2, 4), 420 - tooltipWidth - 4);
                const ty = anchorY - tooltipHeight - 10;

                return (
                  <g className="chart-tooltip" style={{ pointerEvents: 'none' }}>
                    <rect
                      x={tx}
                      y={ty}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx={6}
                      ry={6}
                      fill="#1d2433"
                      opacity={0.9}
                    />
                    <text
                      x={tx + tooltipWidth / 2}
                      y={ty + 14}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="inherit"
                    >
                      {monthLabel}
                    </text>
                    <text
                      x={tx + tooltipWidth / 2}
                      y={ty + 28}
                      textAnchor="middle"
                      fill={hoveredPoint.count > 0 ? '#ffac4a' : '#94a3b8'}
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="inherit"
                    >
                      {countLabel}
                    </text>
                    <line
                      x1={hoveredPoint.x}
                      y1={anchorY + (hoveredPoint.count > 0 ? 6 : 0)}
                      x2={hoveredPoint.x}
                      y2={162}
                      stroke="#ff943b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={hoveredPoint.count > 0 ? 0.5 : 0.25}
                    />
                  </g>
                );
              })()}
            </svg>
            <div className="chart-axis">
              {monthActivity.map((item) => (
                <Text as="span" size="sm" key={item.key}>
                  {item.label}
                </Text>
              ))}
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
