import './Dashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import { useAdminData } from '../../../services/adminData';
import { fetchAdminProducts, fetchAdminSimulations, fetchAdminSupportItems, fetchAdminUsers } from '../../../services/adminMongo';
import {
  fetchExportedDocuments,
  subscribeExportedDocumentsChange,
} from '../../../services/exportedDocuments';
import { fetchProjects, subscribeProjectsChange } from '../../../services/projects';

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
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (7 - index));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthItems = items.filter((item) => {
      const itemDate = new Date(item.exportedAt || item.createdAt || item.updatedAt || item.date || item.submittedAt);
      if (Number.isNaN(itemDate.getTime())) return false;
      return itemDate.getFullYear() === date.getFullYear() && itemDate.getMonth() === date.getMonth();
    });

    return {
      key: monthKey,
      label: monthFormatter.format(date).replace('.', ''),
      count: monthItems.length,
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

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function formatExportDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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

function mapExportToSimulation(document) {
  return {
    ...document,
    id: `exported-${document.id}`,
    sourceType: 'export',
    sourceId: document.id,
    user: document.userName || 'Utilisateur ArchiPrice',
    email: document.userEmail || 'Compte user',
    status: document.status || 'Succès',
    date: formatExportDate(document.exportedAt),
    total: formatFCFA(document.amount),
    products: document.itemCount || document.items?.length || 0,
  };
}

function mapProjectToSimulation(project) {
  return {
    id: `project-${project.id}`,
    sourceType: 'project',
    sourceId: project.id,
    user: project.clientName || project.userName || 'Utilisateur ArchiPrice',
    email: project.userEmail || 'Projet workspace',
    date: formatExportDate(project.updatedAt || project.createdAt),
    total: formatFCFA(project.budget || project.amount || project.total || 0),
    products: project.itemCount || project.items?.length || 0,
    status: project.status === 'draft' ? 'Projet créé' : project.status || 'Projet créé',
    projectName: project.name || 'Projet sans nom',
  };
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
  const [adminData] = useAdminData();
  const [supportItems, setSupportItems] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [mongoSimulations, setMongoSimulations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [hiddenSimulationIds, setHiddenSimulationIds] = useState(readHiddenSimulationIds);
  const [adminUsers, setAdminUsers] = useState([]);
  const [exportedDocuments, setExportedDocuments] = useState(() => fetchExportedDocuments());

  useEffect(() => {
    let cancelled = false;

    function loadSupportItems() {
      fetchAdminSupportItems()
        .then((items) => {
          if (!cancelled) setSupportItems(items.filter((item) => item.tab === 'feedback'));
        })
        .catch(() => {
          if (!cancelled) setSupportItems([]);
        });
    }

    loadSupportItems();
    const refreshTimer = window.setInterval(loadSupportItems, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    function loadProducts() {
      fetchAdminProducts()
        .then((items) => {
          if (!cancelled) setAdminProducts(items);
        })
        .catch(() => {
          if (!cancelled) setAdminProducts([]);
        });
    }

    loadProducts();
    const refreshTimer = window.setInterval(loadProducts, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    function loadSimulations() {
      fetchAdminSimulations()
        .then((items) => {
          if (!cancelled) setMongoSimulations(items);
        })
        .catch(() => {
          if (!cancelled) setMongoSimulations([]);
        });
    }

    loadSimulations();
    const refreshTimer = window.setInterval(loadSimulations, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });

    const unsubscribe = subscribeProjectsChange((list) => {
      if (!cancelled) setProjects(list);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    function refreshHiddenSimulations(event) {
      if (event.type === 'storage' && event.key !== HIDDEN_SIMULATIONS_KEY) return;
      setHiddenSimulationIds(readHiddenSimulationIds());
    }

    window.addEventListener('storage', refreshHiddenSimulations);
    return () => window.removeEventListener('storage', refreshHiddenSimulations);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function loadUsers() {
      fetchAdminUsers()
        .then((items) => {
          if (!cancelled) setAdminUsers(items);
        })
        .catch(() => {
          if (!cancelled) setAdminUsers([]);
        });
    }

    loadUsers();
    const refreshTimer = window.setInterval(loadUsers, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => subscribeExportedDocumentsChange(setExportedDocuments), []);

  const synchronizedSimulations = useMemo(() => ([
    ...projects.map(mapProjectToSimulation),
    ...exportedDocuments.map(mapExportToSimulation),
    ...mongoSimulations.map((simulation) => ({
      ...simulation,
      sourceType: simulation.sourceType || simulation.source || 'simulation',
      sourceId: simulation.sourceId || simulation.projectId || simulation.id,
    })),
  ]), [exportedDocuments, mongoSimulations, projects]);

  const visibleSimulations = useMemo(() => (
    mergeSimulationSources(synchronizedSimulations)
      .filter((simulation) => !hiddenSimulationIds.includes(String(simulation.id)))
  ), [hiddenSimulationIds, synchronizedSimulations]);

  const simpleUsers = useMemo(() => adminUsers.filter((user) => getUserRole(user) === 'user'), [adminUsers]);

  const stats = useMemo(() => {
    const products = adminProducts;
    const suppliers = adminData.suppliers || [];
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
  }, [adminData.suppliers, adminProducts, simpleUsers.length, supportItems, visibleSimulations]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = useMemo(() => getActivityRows(adminProducts, supportItems, visibleSimulations).filter((item) => (
    !dashboardSearchTerm
    || String(item.title || '').toLowerCase().includes(dashboardSearchTerm)
    || String(item.status || '').toLowerCase().includes(dashboardSearchTerm)
  )), [adminProducts, dashboardSearchTerm, supportItems, visibleSimulations]);
  const userMonthActivity = useMemo(() => buildMonthActivity(simpleUsers), [simpleUsers]);
  const supplierMonthActivity = useMemo(() => buildMonthActivity(adminData.suppliers || []), [adminData.suppliers]);
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
            <svg viewBox="0 0 420 210" role="img">
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
              <path
                className="chart-fill chart-fill--supplier"
                d={supplierActivityChart.fillPath}
              />
              <path
                className="chart-fill chart-fill--user"
                d={userActivityChart.fillPath}
              />
              <path
                className="chart-line chart-line--supplier"
                d={supplierActivityChart.linePath}
              />
              <path
                className="chart-line chart-line--user"
                d={userActivityChart.linePath}
                style={{ strokeWidth: userStrokeWidth }}
              />
              {supplierActivityChart.points.map((point) => (
                <circle key={`supplier-${point.key}`} className="chart-point--supplier" cx={point.x} cy={point.y} r={point.count ? 4 : 2.5} />
              ))}
              {userActivityChart.points.map((point) => (
                <circle key={`user-${point.key}`} className="chart-point--user" cx={point.x} cy={point.y} r={point.count ? 5 : 3.5} />
              ))}
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
