import './Dashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { fetchAdminProducts, fetchAdminSimulations, fetchAdminSuppliers, fetchAdminSupportItems, fetchAdminUsers } from '../../../services/adminMongo';

const HIDDEN_SIMULATIONS_KEY = 'archiprice:admin-hidden-simulations';

function formatDate(value) {
  if (!value) return 'Date non renseignée';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return String(value);

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
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
  // Le filtre cherche le mois ET l'année exacts de chaque item —
  // il n'est pas limité à l'année courante, donc les inscriptions
  // des années précédentes (ex. 2025) apparaissent sur leur mois respectif
  // si ce mois existe dans la fenêtre jan→déc courante.
  // Pour afficher l'historique multi-années, on regroupe par mois (index 0-11)
  // toutes les inscriptions, quelle que soit l'année.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(currentYear, index, 1);
    const isFuture = index > currentMonth;
    const monthKey = `${currentYear}-${String(index + 1).padStart(2, '0')}`;

    // Compte tous les items dont le mois (0-indexed) correspond, toutes années confondues.
    // Cela permet d'afficher les inscriptions passées (2024, 2025) sur leur mois.
    const monthItems = isFuture ? [] : items.filter((item) => {
      const itemDate = new Date(
        item.exportedAt || item.createdAt || item.updatedAt || item.date || item.submittedAt,
      );
      if (Number.isNaN(itemDate.getTime())) return false;
      return itemDate.getMonth() === index; // toutes années confondues
    });

    return {
      key: monthKey,
      label: monthFormatter.format(date).replace('.', ''),
      count: monthItems.length,
      isFuture,
    };
  });
}

function buildActivityPath(activity = []) {
  // Modèle : courbe continue connectant TOUS les mois (comme Rainfall vs Temperature).
  // Même les mois à zéro sont sur la ligne — pas de segments brisés.
  // Échelle linéaire normalisée sur le maximum — fidèle aux valeurs réelles.
  const counts = activity.map((item) => item.count);
  const maxCount = Math.max(...counts, 1);
  const FLOOR_Y = 162;   // plancher SVG (y max visible)
  const TOP_Y = 30;      // sommet SVG (y min)
  const CHART_HEIGHT = FLOOR_Y - TOP_Y; // 132px

  // Tous les points incluant les mois futurs (mis au plancher)
  const points = activity.map((item, index) => {
    const x = 30 + ((364 / Math.max(activity.length - 1, 1)) * index);
    const y = item.isFuture
      ? FLOOR_Y
      : FLOOR_Y - ((item.count / maxCount) * CHART_HEIGHT);
    return { ...item, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  if (points.length === 0) {
    return { points, linePath: '', fillPath: '' };
  }

  // Courbe lisse via approximation Catmull-Rom → Bézier cubique.
  // Chaque segment utilise les points voisins comme points de contrôle
  // pour produire une courbe continue et naturelle (comme le modèle image).
  function catmullRomToBezier(pts) {
    if (pts.length < 2) return '';
    const TENSION = 0.4; // 0 = angles droits, 0.5 = spline très lisse

    let path = `M${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      // Points de contrôle Bézier dérivés de Catmull-Rom
      const cp1x = p1.x + (p2.x - p0.x) * TENSION;
      const cp1y = p1.y + (p2.y - p0.y) * TENSION;
      const cp2x = p2.x - (p3.x - p1.x) * TENSION;
      const cp2y = p2.y - (p3.y - p1.y) * TENSION;

      path += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2.x} ${p2.y}`;
    }

    return path;
  }

  const linePath = catmullRomToBezier(points);

  // Fill : ferme le polygone sous la courbe complète
  const fillPath = linePath
    ? `${linePath} L${points.at(-1).x} 184 L${points[0].x} 184 Z`
    : '';

  return { points, linePath, fillPath };
}

function getSimulationDate(simulation) {
  return simulation.exportedAt || simulation.createdAt || simulation.updatedAt || simulation.date;
}

function readHiddenSimulationIds() {
  try {
    return JSON.parse(window.localStorage.getItem(HIDDEN_SIMULATIONS_KEY) || '[]').map(String);
  } catch {
    return [];
  }
}

function isAvailable(product) {
  return String(product.availability || '').toLowerCase() === 'disponible';
}

function isActiveSupplier(supplier) {
  return String(supplier.status || '').toLowerCase() === 'actif';
}

function isSuccessfulSimulation(simulation) {
  return String(simulation.status || '').toLowerCase().includes('succ');
}

function isOpenSupport(item) {
  return String(item.status || '').toLowerCase() === 'ouvert';
}

function getUserRole(user) {
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'supplier') return 'supplier';
  return 'user';
}

function mergeSimulationSources(items) {
  const simulationsById = new Map();

  items.forEach((item) => {
    if (!item?.id || simulationsById.has(item.id)) return;
    simulationsById.set(item.id, item);
  });

  return [...simulationsById.values()];
}

function getActivityRows(products = [], supportItems = [], simulations = []) {
  const productRows = products.slice(0, 2).map((product, index) => ({
    id: `product-${product.id || index}`,
    title: product.name || 'Article sans nom',
    status: product.availability || 'Catalogue',
    date: product.updatedAt || product.createdAt || product.city || '',
    route: '/admin/catalogue/products',
  }));

  const simulationRows = simulations.slice(0, 2).map((simulation, index) => ({
    id: `simulation-${simulation.id || index}`,
    title: `Simulation ${simulation.user || 'utilisateur'}`,
    status: simulation.status || 'Simulation',
    date: getSimulationDate(simulation) || '',
    route: '/admin/simulations',
  }));

  const supportRows = supportItems.slice(0, 2).map((item, index) => ({
    id: `support-${item.id || index}`,
    title: item.subject || 'Ticket support',
    status: item.status || item.type || 'Support',
    date: item.date || item.createdAt || '',
    route: '/admin/support',
  }));

  return [...productRows, ...simulationRows, ...supportRows].slice(0, 4);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [supportItems, setSupportItems] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [mongoSimulations, setMongoSimulations] = useState([]);
  const [hiddenSimulationIds, setHiddenSimulationIds] = useState(readHiddenSimulationIds);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSuppliers, setAdminSuppliers] = useState([]);
  const [hoveredUserPoint, setHoveredUserPoint] = useState(null);
  const [hoveredSupplierPoint, setHoveredSupplierPoint] = useState(null);

  const loadSupportItems = useCallback(() => {
    fetchAdminSupportItems()
      .then((items) => setSupportItems(items.filter((item) => item.tab === 'feedback')))
      .catch(() => setSupportItems([]));
  }, []);

  const loadProducts = useCallback(() => {
    fetchAdminProducts()
      .then(setAdminProducts)
      .catch(() => setAdminProducts([]));
  }, []);

  const loadSimulations = useCallback(() => {
    fetchAdminSimulations()
      .then(setMongoSimulations)
      .catch(() => setMongoSimulations([]));
  }, []);

  const loadUsers = useCallback(() => {
    Promise.all([fetchAdminUsers(), fetchAdminSuppliers()])
      .then(([users, suppliers]) => {
        setAdminUsers(users);
        setAdminSuppliers(suppliers);
      })
      .catch(() => {
        setAdminUsers([]);
        setAdminSuppliers([]);
      });
  }, []);

  useEffect(() => {
    loadSupportItems();
  }, [loadSupportItems]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useRealtimeRefresh(loadSupportItems, ['support-items']);
  useRealtimeRefresh(loadProducts, ['admin-products', 'supplier-products']);
  useRealtimeRefresh(loadSimulations, ['simulations']);
  useRealtimeRefresh(loadUsers, ['users', 'suppliers']);

  useEffect(() => {
    function refreshHiddenSimulations(event) {
      if (event.type === 'storage' && event.key !== HIDDEN_SIMULATIONS_KEY) return;
      setHiddenSimulationIds(readHiddenSimulationIds());
    }

    window.addEventListener('storage', refreshHiddenSimulations);
    return () => window.removeEventListener('storage', refreshHiddenSimulations);
  }, []);

  const synchronizedSimulations = useMemo(() => ([
    ...mongoSimulations.map((simulation) => ({
      ...simulation,
      sourceType: simulation.sourceType || simulation.source || 'simulation',
      sourceId: simulation.sourceId || simulation.projectId || simulation.id,
    })),
  ]), [mongoSimulations]);

  const visibleSimulations = useMemo(() => (
    mergeSimulationSources(synchronizedSimulations)
      .filter((simulation) => !hiddenSimulationIds.includes(String(simulation.id)))
  ), [hiddenSimulationIds, synchronizedSimulations]);

  const simpleUsers = useMemo(() => adminUsers.filter((user) => getUserRole(user) === 'user'), [adminUsers]);

  const stats = useMemo(() => {
    const products = adminProducts;
    const suppliers = adminSuppliers;
    const simulations = visibleSimulations;

    return {
      totalProducts: products.length,
      availableProducts: products.filter(isAvailable).length,
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(isActiveSupplier).length,
      totalSimulations: simulations.length,
      successfulSimulations: simulations.filter(isSuccessfulSimulation).length,
      totalSupport: supportItems.length,
      openSupport: supportItems.filter(isOpenSupport).length,
      totalUsers: simpleUsers.length,
    };
  }, [adminProducts, adminSuppliers, simpleUsers.length, supportItems, visibleSimulations]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = useMemo(() => getActivityRows(adminProducts, supportItems, visibleSimulations).filter((item) => (
    !dashboardSearchTerm
    || String(item.title || '').toLowerCase().includes(dashboardSearchTerm)
    || String(item.status || '').toLowerCase().includes(dashboardSearchTerm)
  )), [adminProducts, dashboardSearchTerm, supportItems, visibleSimulations]);
  const userMonthActivity = useMemo(() => buildMonthActivity(simpleUsers), [simpleUsers]);
  const supplierMonthActivity = useMemo(() => buildMonthActivity(adminSuppliers), [adminSuppliers]);
  const userActivityChart = useMemo(() => buildActivityPath(userMonthActivity), [userMonthActivity]);
  const supplierActivityChart = useMemo(() => buildActivityPath(supplierMonthActivity), [supplierMonthActivity]);
  const userStrokeWidth = simpleUsers.length > 0
    ? Math.min(8, 4 + Math.log10(simpleUsers.length + 1) * 2)
    : 5;

  const repartitionTotal = stats.totalProducts
    + stats.totalSuppliers
    + stats.totalSimulations
    + stats.totalSupport
    + stats.totalUsers;
  const repartitionData = [
    {
      name: 'Utilisateurs',
      value: stats.totalUsers,
      chartValue: getDonutDisplayValue(stats.totalUsers, repartitionTotal),
      percent: getPercent(stats.totalUsers, repartitionTotal),
      color: '#ff943b',
      unit: 'utilisateur',
    },
    {
      name: 'Articles catalogue',
      value: stats.totalProducts,
      chartValue: getDonutDisplayValue(stats.totalProducts, repartitionTotal),
      percent: getPercent(stats.totalProducts, repartitionTotal),
      color: '#5877f7',
      unit: 'élément',
    },
    {
      name: 'Fournisseurs',
      value: stats.totalSuppliers,
      chartValue: getDonutDisplayValue(stats.totalSuppliers, repartitionTotal),
      percent: getPercent(stats.totalSuppliers, repartitionTotal),
      color: '#ffc865',
      unit: 'élément',
    },
    {
      name: 'Simulations',
      value: stats.totalSimulations,
      chartValue: getDonutDisplayValue(stats.totalSimulations, repartitionTotal),
      percent: getPercent(stats.totalSimulations, repartitionTotal),
      color: '#22c55e',
      unit: 'élément',
    },
    {
      name: 'Support',
      value: stats.totalSupport,
      chartValue: getDonutDisplayValue(stats.totalSupport, repartitionTotal),
      percent: getPercent(stats.totalSupport, repartitionTotal),
      color: '#1d0870',
      unit: 'élément',
    },
  ];

  function handleStatKeyDown(event, route) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigate(route);
  }

  return (
    <div className="dashboard-page admin-dashboard-page">
      <div className="dashboard-grid">
        <section id="admin-dashboard-summary" className="dashboard-stats" aria-label="Résumé backoffice">
          <article
            className="stat-card stat-blue stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/catalogue/products')}
            onKeyDown={(event) => handleStatKeyDown(event, '/admin/catalogue/products')}
          >
            <Text as="span" variant="bold" size="sm">
              Articles catalogue
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.totalProducts).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 23 C16 10 22 30 35 16 S58 6 74 10" />
            </svg>
          </article>

          <article
            className="stat-card stat-yellow stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/suppliers')}
            onKeyDown={(event) => handleStatKeyDown(event, '/admin/suppliers')}
          >
            <Text as="span" variant="bold" size="sm">
              Fournisseurs actifs
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.activeSuppliers).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 24 C18 12 24 22 35 18 S50 29 74 7" />
            </svg>
          </article>

          <article
            className="stat-card stat-red stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/simulations')}
            onKeyDown={(event) => handleStatKeyDown(event, '/admin/simulations')}
          >
            <Text as="span" variant="bold" size="sm">
              Simulations réussies
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.successfulSimulations).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 22 C13 17 19 27 30 20 S46 10 55 19 S66 9 74 13" />
            </svg>
          </article>

          <article
            className="stat-card stat-cyan stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/support')}
            onKeyDown={(event) => handleStatKeyDown(event, '/admin/support')}
          >
            <Text as="span" variant="bold" size="sm">
              Support ouvert
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.openSupport).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 21 C18 20 17 12 29 13 S39 25 50 20 S58 6 74 16" />
            </svg>
          </article>
        </section>

        <section className="dashboard-panel activity-panel">
          <div className="panel-heading">
            <h1>Activité backoffice</h1>
            <Text as="span" variant="bold" size="sm">
              Comptes
            </Text>
          </div>
          <div className="line-chart" aria-label="Graphique d'activité backoffice">
            <svg
              viewBox="0 0 420 210"
              role="img"
              style={{ overflow: 'visible' }}
              onMouseLeave={() => { setHoveredUserPoint(null); setHoveredSupplierPoint(null); }}
              onMouseMove={(e) => {
                const svgEl = e.currentTarget;
                const rect = svgEl.getBoundingClientRect();
                // Convertir les coordonnées écran en coordonnées viewBox (0-420)
                const svgW = rect.width || 420;
                const svgH = rect.height || 210;
                const mouseX = ((e.clientX - rect.left) / svgW) * 420;
                const mouseY = ((e.clientY - rect.top) / svgH) * 210;

                const uPts = userActivityChart.points.filter((p) => !p.isFuture);
                const sPts = supplierActivityChart.points.filter((p) => !p.isFuture);

                // Trouver le point le plus proche en X pour chaque série
                const closestUser = uPts.length > 0
                  ? uPts.reduce((a, b) => Math.abs(b.x - mouseX) < Math.abs(a.x - mouseX) ? b : a)
                  : null;
                const closestSupplier = sPts.length > 0
                  ? sPts.reduce((a, b) => Math.abs(b.x - mouseX) < Math.abs(a.x - mouseX) ? b : a)
                  : null;

                if (!closestUser && !closestSupplier) return;

                // Distance en Y du curseur à chaque courbe
                const distUser = closestUser ? Math.abs(closestUser.y - mouseY) : Infinity;
                const distSupplier = closestSupplier ? Math.abs(closestSupplier.y - mouseY) : Infinity;

                // Seuil de proximité : 40px en coordonnées viewBox
                const THRESHOLD = 40;

                if (distUser <= distSupplier && distUser < THRESHOLD) {
                  setHoveredUserPoint(closestUser);
                  setHoveredSupplierPoint(null);
                } else if (distSupplier < distUser && distSupplier < THRESHOLD) {
                  setHoveredSupplierPoint(closestSupplier);
                  setHoveredUserPoint(null);
                } else {
                  setHoveredUserPoint(null);
                  setHoveredSupplierPoint(null);
                }
              }}
            >
              <defs>
                <linearGradient id="activityUserFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffac4a" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#ffac4a" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="activitySupplierFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#5877f7" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#5877f7" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Zone de capture de souris sur tout le SVG */}
              <rect x={0} y={0} width={420} height={184} fill="transparent" style={{ cursor: 'crosshair' }} />

              <path className="chart-fill chart-fill--supplier" d={supplierActivityChart.fillPath} />
              <path className="chart-fill chart-fill--user" d={userActivityChart.fillPath} />
              <path className="chart-line chart-line--supplier" d={supplierActivityChart.linePath} />
              <path className="chart-line chart-line--user" d={userActivityChart.linePath} style={{ strokeWidth: userStrokeWidth }} />

              {/* Cercles supplier */}
              {supplierActivityChart.points.map((point) => (
                <circle
                  key={`supplier-${point.key}`}
                  className="chart-point--supplier"
                  cx={point.x}
                  cy={point.y}
                  r={point.count > 0 ? 4 : 2.5}
                  opacity={point.isFuture ? 0.18 : point.count > 0 ? 1 : 0.45}
                />
              ))}

              {/* Cercles user */}
              {userActivityChart.points.map((point) => (
                <circle
                  key={`user-${point.key}`}
                  className="chart-point--user"
                  cx={point.x}
                  cy={point.y}
                  r={point.count > 0 ? 5 : 3.5}
                  opacity={point.isFuture ? 0.18 : point.count > 0 ? 1 : 0.45}
                />
              ))}

              {/* Tooltip supplier */}
              {hoveredSupplierPoint && (() => {
                const now = new Date();
                const monthLabel = hoveredSupplierPoint.label
                  ? `${hoveredSupplierPoint.label} ${now.getFullYear()}`
                  : hoveredSupplierPoint.key || '';
                const countLabel = hoveredSupplierPoint.count > 0
                  ? `${hoveredSupplierPoint.count} boutique${hoveredSupplierPoint.count > 1 ? 's' : ''}`
                  : 'Aucune boutique';
                const tooltipWidth = Math.max(monthLabel.length, countLabel.length) * 7 + 20;
                const tooltipHeight = 38;
                const anchorY = hoveredSupplierPoint.count > 0 ? hoveredSupplierPoint.y : 162;
                const tx = Math.min(Math.max(hoveredSupplierPoint.x - tooltipWidth / 2, 4), 420 - tooltipWidth - 4);
                const ty = anchorY - tooltipHeight - 10;
                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect x={tx} y={ty} width={tooltipWidth} height={tooltipHeight} rx={6} ry={6} fill="#1d2433" opacity={0.9} />
                    <text x={tx + tooltipWidth / 2} y={ty + 14} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="inherit">
                      {monthLabel}
                    </text>
                    <text x={tx + tooltipWidth / 2} y={ty + 28} textAnchor="middle"
                      fill={hoveredSupplierPoint.count > 0 ? '#5877f7' : '#94a3b8'} fontSize="10" fontWeight="600" fontFamily="inherit">
                      {countLabel}
                    </text>
                    <line x1={hoveredSupplierPoint.x} y1={anchorY + (hoveredSupplierPoint.count > 0 ? 6 : 0)}
                      x2={hoveredSupplierPoint.x} y2={162}
                      stroke="#5877f7" strokeWidth={1} strokeDasharray="3 3"
                      opacity={hoveredSupplierPoint.count > 0 ? 0.5 : 0.25} />
                  </g>
                );
              })()}

              {/* Tooltip user */}
              {hoveredUserPoint && (() => {
                const now = new Date();
                const monthLabel = hoveredUserPoint.label
                  ? `${hoveredUserPoint.label} ${now.getFullYear()}`
                  : hoveredUserPoint.key || '';
                const countLabel = hoveredUserPoint.count > 0
                  ? `${hoveredUserPoint.count} utilisateur${hoveredUserPoint.count > 1 ? 's' : ''}`
                  : 'Aucun utilisateur';
                const tooltipWidth = Math.max(monthLabel.length, countLabel.length) * 7 + 20;
                const tooltipHeight = 38;
                const anchorY = hoveredUserPoint.count > 0 ? hoveredUserPoint.y : 162;
                const tx = Math.min(Math.max(hoveredUserPoint.x - tooltipWidth / 2, 4), 420 - tooltipWidth - 4);
                const ty = anchorY - tooltipHeight - 10;
                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect x={tx} y={ty} width={tooltipWidth} height={tooltipHeight} rx={6} ry={6} fill="#1d2433" opacity={0.9} />
                    <text x={tx + tooltipWidth / 2} y={ty + 14} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="inherit">
                      {monthLabel}
                    </text>
                    <text x={tx + tooltipWidth / 2} y={ty + 28} textAnchor="middle"
                      fill={hoveredUserPoint.count > 0 ? '#ffac4a' : '#94a3b8'} fontSize="10" fontWeight="600" fontFamily="inherit">
                      {countLabel}
                    </text>
                    <line x1={hoveredUserPoint.x} y1={anchorY + (hoveredUserPoint.count > 0 ? 6 : 0)}
                      x2={hoveredUserPoint.x} y2={162}
                      stroke="#ff943b" strokeWidth={1} strokeDasharray="3 3"
                      opacity={hoveredUserPoint.count > 0 ? 0.5 : 0.25} />
                  </g>
                );
              })()}
            </svg>
            <div className="chart-axis">
              {userMonthActivity.map((item, index) => (
                <Text as="span" size="sm" key={`${item.label}-${index}`}>
                  {item.label}
                </Text>
              ))}
            </div>
            <div className="chart-legend">
              
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> Utilisateur simple ({stats.totalUsers})</Text>
              <Text as="span" variant="bold" size="sm"><i className="legend-blue" /> Boutique ({stats.totalSuppliers})</Text>
            </div>
          </div>
        </section>

        <section id="admin-dashboard-history" className="dashboard-panel history-panel">
          <div className="panel-heading row-heading">
            <h2>Activités récentes</h2>
            <Text as="span" variant="bold" size="sm">
              Filtrer par date : Tout
            </Text>
          </div>
          {history.length === 0 ? (
            <Text className="muted history-empty">Aucune activité enregistrée pour le moment.</Text>
          ) : (
            <ul className="history-list">
              {history.map((item, index) => (
                <li key={`${item.id || item.title}-${index}`}>
                  <button type="button" onClick={() => navigate(item.route || '/admin')}>
                    <span className={`history-icon history-icon-${index + 1}`} aria-hidden="true" />
                    <div>
                      <Text as="strong" variant="bold" size="sm">
                        {item.title}
                      </Text>
                      <Text as="span" variant="bold" size="sm">
                        {item.status} · {formatDate(item.date)}
                      </Text>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="admin-dashboard-repartition" className="dashboard-panel repartition-panel">
          <DonutChartCard title="Répartition" data={repartitionData} />
        </section>
      </div>

      <div className="dashboard-new-project">
        <Button
          type="button"
          size="lg"
          icon={<Icon name="Add" />}
          onClick={() => navigate('/admin/suppliers')}
        >
          Voir les fournisseurs
        </Button>
      </div>
    </div>
  );
}
