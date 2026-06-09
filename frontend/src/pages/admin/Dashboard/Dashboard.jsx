import './Dashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import { useAdminData } from '../../../services/adminData';
import { fetchAdminSimulations, fetchAdminSupportItems, fetchAdminUsers } from '../../../services/adminMongo';
import {
  fetchExportedDocuments,
  subscribeExportedDocumentsChange,
} from '../../../services/exportedDocuments';

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
  if (String(user.role || '').toLowerCase() === 'admin' || user.type === 'Admin') return 'admin';
  if (String(user.role || '').toLowerCase() === 'supplier' || user.type === 'Fournisseur') return 'supplier';
  return 'user';
}

function getActivityRows(adminData, supportItems = [], simulations = []) {
  const productRows = (adminData.products || []).slice(0, 2).map((product, index) => ({
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
  const [mongoSimulations, setMongoSimulations] = useState([]);
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
    ...exportedDocuments.map((document) => ({
      ...document,
      id: `exported-${document.id}`,
      user: document.userName || 'Utilisateur ArchiPrice',
      email: document.userEmail || 'Compte user',
      status: document.status || 'Succès',
      date: document.exportedAt,
    })),
    ...mongoSimulations,
  ]), [exportedDocuments, mongoSimulations]);

  const stats = useMemo(() => {
    const products = adminData.products || [];
    const suppliers = adminData.suppliers || [];
    const simulations = synchronizedSimulations;

    return {
      totalProducts: products.length,
      availableProducts: products.filter(isAvailable).length,
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(isActiveSupplier).length,
      totalSimulations: simulations.length,
      successfulSimulations: simulations.filter(isSuccessfulSimulation).length,
      totalSupport: supportItems.length,
      openSupport: supportItems.filter(isOpenSupport).length,
    };
  }, [adminData, supportItems, synchronizedSimulations]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const simpleUsers = useMemo(() => adminUsers.filter((user) => getUserRole(user) === 'user'), [adminUsers]);
  const history = useMemo(() => getActivityRows(adminData, supportItems, synchronizedSimulations).filter((item) => (
    !dashboardSearchTerm
    || String(item.title || '').toLowerCase().includes(dashboardSearchTerm)
    || String(item.status || '').toLowerCase().includes(dashboardSearchTerm)
  )), [adminData, dashboardSearchTerm, supportItems, synchronizedSimulations]);
  const userMonthActivity = useMemo(() => buildMonthActivity(simpleUsers), [simpleUsers]);
  const supplierMonthActivity = useMemo(() => buildMonthActivity(adminData.suppliers || []), [adminData.suppliers]);
  const userActivityChart = useMemo(() => buildActivityPath(userMonthActivity), [userMonthActivity]);
  const supplierActivityChart = useMemo(() => buildActivityPath(supplierMonthActivity), [supplierMonthActivity]);

  const repartitionTotal = stats.totalProducts + stats.totalSuppliers + stats.totalSimulations + stats.totalSupport;
  const repartitionData = [
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

  return (
    <div className="dashboard-page admin-dashboard-page">
      <div className="dashboard-grid">
        <section id="admin-dashboard-summary" className="dashboard-stats" aria-label="Résumé backoffice">
          <article className="stat-card stat-blue">
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

          <article className="stat-card stat-yellow">
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

          <article className="stat-card stat-red">
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

          <article className="stat-card stat-cyan">
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
                className="chart-fill chart-fill--user"
                d={userActivityChart.fillPath}
              />
              <path
                className="chart-fill chart-fill--supplier"
                d={supplierActivityChart.fillPath}
              />
              <path
                className="chart-line chart-line--user"
                d={userActivityChart.linePath}
              />
              <path
                className="chart-line chart-line--supplier"
                d={supplierActivityChart.linePath}
              />
              {userActivityChart.points.map((point) => (
                <circle key={`user-${point.key}`} className="chart-point--user" cx={point.x} cy={point.y} r={point.count ? 5 : 3} />
              ))}
              {supplierActivityChart.points.map((point) => (
                <circle key={`supplier-${point.key}`} className="chart-point--supplier" cx={point.x} cy={point.y} r={point.count ? 4 : 2.5} />
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
              
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> Utilisateur simple</Text>
              <Text as="span" variant="bold" size="sm"><i className="legend-blue" /> Boutique</Text>
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
          onClick={() => navigate('/admin/catalogue/products')}
        >
          Gérer les articles
        </Button>
      </div>
    </div>
  );
}
