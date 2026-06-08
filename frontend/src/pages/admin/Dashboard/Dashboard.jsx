import './Dashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import { useAdminData } from '../../../services/adminData';
import { fetchAdminSupportItems } from '../../../services/adminMongo';

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
  const months = [...new Set(items
    .map((item) => item.createdAt || item.updatedAt || item.date || item.submittedAt)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => monthFormatter.format(date).replace('.', '')))];

  if (months.length > 0) return months.slice(-8).map((label) => ({ label }));

  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (7 - index));
    return { label: monthFormatter.format(date).replace('.', '') };
  });
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

function getActivityRows(adminData, supportItems = []) {
  const productRows = (adminData.products || []).slice(0, 2).map((product, index) => ({
    id: `product-${product.id || index}`,
    title: product.name || 'Article sans nom',
    status: product.availability || 'Catalogue',
    date: product.updatedAt || product.createdAt || product.city || '',
  }));

  const simulationRows = (adminData.simulations || []).slice(0, 2).map((simulation, index) => ({
    id: `simulation-${simulation.id || index}`,
    title: `Simulation ${simulation.user || 'utilisateur'}`,
    status: simulation.status || 'Simulation',
    date: simulation.date || simulation.createdAt || '',
  }));

  const supportRows = supportItems.slice(0, 2).map((item, index) => ({
    id: `support-${item.id || index}`,
    title: item.subject || 'Ticket support',
    status: item.status || item.type || 'Support',
    date: item.date || item.createdAt || '',
  }));

  return [...productRows, ...simulationRows, ...supportRows].slice(0, 4);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [adminData] = useAdminData();
  const [supportItems, setSupportItems] = useState([]);

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

  const stats = useMemo(() => {
    const products = adminData.products || [];
    const suppliers = adminData.suppliers || [];
    const simulations = adminData.simulations || [];

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
  }, [adminData, supportItems]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = useMemo(() => getActivityRows(adminData, supportItems).filter((item) => (
    !dashboardSearchTerm
    || String(item.title || '').toLowerCase().includes(dashboardSearchTerm)
    || String(item.status || '').toLowerCase().includes(dashboardSearchTerm)
  )), [adminData, dashboardSearchTerm, supportItems]);
  const monthActivity = useMemo(() => buildMonthActivity([
    ...(adminData.products || []),
    ...(adminData.suppliers || []),
    ...(adminData.simulations || []),
    ...supportItems,
  ]), [adminData.products, adminData.simulations, adminData.suppliers, supportItems]);

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
               simulations
            </Text>
          </div>
          <div className="line-chart" aria-label="Graphique d'activité backoffice">
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
              {monthActivity.map((item, index) => (
                <Text as="span" size="sm" key={`${item.label}-${index}`}>
                  {item.label}
                </Text>
              ))}
            </div>
            <div className="chart-legend">
              
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> Simulations</Text>
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
                  <span className={`history-icon history-icon-${index + 1}`} aria-hidden="true" />
                  <div>
                    <Text as="strong" variant="bold" size="sm">
                      {item.title}
                    </Text>
                    <Text as="span" variant="bold" size="sm">
                      {item.status} · {formatDate(item.date)}
                    </Text>
                  </div>
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
