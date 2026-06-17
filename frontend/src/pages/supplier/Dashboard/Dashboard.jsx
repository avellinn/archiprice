import './Dashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Loader, Text } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { useAdminData } from '../../../services/adminData';
import { getApiErrorMessage } from '../../../services/api';
import { fetchSupplierWorkspace, subscribeSupplierWorkspaceChange } from '../../../services/supplier';

const HIDDEN_SUPPLIER_DEMAND_ITEMS_KEY = 'archiprice:supplier-demand-hidden-items';

const STATUS_COPY = {
  active: 'Actif',
  actif: 'Actif',
  draft: 'Brouillon',
  pending: 'En attente',
  submitted: 'En attente',
  published: 'Publié',
  approved: 'Publié',
  rejected: 'Refusé',
  archived: 'Archivé',
};

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
      const itemDate = new Date(item.createdAt || item.updatedAt || item.submittedAt || item.date);
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

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isPublished(product) {
  const publicationStatus = normalizeStatus(product.publicationStatus || product.statusPublication);
  const status = normalizeStatus(product.status);

  return ['validé', 'valide', 'validée', 'validee', 'approved', 'published', 'publié', 'publie'].includes(publicationStatus)
    || ['approved', 'published', 'publié', 'publie', 'validé', 'valide'].includes(status);
}

function isPending(product) {
  const publicationStatus = normalizeStatus(product.publicationStatus || product.statusPublication);
  const status = normalizeStatus(product.status);

  return ['en attente', 'pending', 'submitted', 'soumis'].includes(publicationStatus)
    || ['pending', 'submitted'].includes(status);
}

function getProductStatusLabel(product) {
  if (isPublished(product)) return 'Publié';
  if (isPending(product)) return 'En attente';

  const status = normalizeStatus(product.status);
  return STATUS_COPY[status] || product.status || product.availability || 'Brouillon';
}

function getEffectiveProductStatusLabel(product, adminProducts = []) {
  const effectiveStatus = getEffectivePublicationStatus(product, adminProducts);
  if (effectiveStatus) {
    return getProductStatusLabel({ ...product, publicationStatus: effectiveStatus });
  }

  return getProductStatusLabel(product);
}

function getAdminProposalForProduct(product, adminProducts = []) {
  return adminProducts.find((item) => (
    String(item.sourceSupplierProductId || '') === String(product.id || product._id || '')
    || String(item.id || '') === String(product.sourceAdminProductId || '')
  ));
}

function getEffectivePublicationStatus(product, adminProducts = []) {
  const adminProposal = getAdminProposalForProduct(product, adminProducts);
  return adminProposal?.publicationStatus
    || product.publicationStatus
    || product.statusPublication
    || product.status
    || '';
}

function isEffectivelyPublished(product, adminProducts = []) {
  return isPublished({
    ...product,
    publicationStatus: getEffectivePublicationStatus(product, adminProducts),
  });
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getHiddenDemandItemsKey(user, supplierProfile) {
  const supplierIdentity = supplierProfile?.id
    || supplierProfile?._id
    || user?.supplierId
    || user?.id
    || user?._id
    || user?.email
    || 'anonymous';

  return `${HIDDEN_SUPPLIER_DEMAND_ITEMS_KEY}:${supplierIdentity}`;
}

function readHiddenDemandItems(storageKey) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue ? JSON.parse(storedValue).map(String) : [];
  } catch {
    return [];
  }
}

function isDemandForSupplier(notification, user, supplierProfile) {
  const supplierIds = [
    user?.supplierId,
    user?.supplier?._id,
    user?.supplier?.id,
    supplierProfile?._id,
    supplierProfile?.id,
    user?.id,
    user?._id,
  ].filter(Boolean).map(String);

  const supplierNames = [
    supplierProfile?.companyName,
    supplierProfile?.name,
    supplierProfile?.shopLabel,
    supplierProfile?.storeLabel,
    user?.shopName,
    user?.companyName,
    user?.storeLabel,
    user?.name,
  ].map(normalizeKey).filter(Boolean);
  const supplierContacts = [
    supplierProfile?.email,
    supplierProfile?.contact,
    user?.email,
    user?.supplier?.email,
  ].map(normalizeKey).filter(Boolean);
  const hasSupplierIdentity = supplierIds.length > 0 || supplierNames.length > 0 || supplierContacts.length > 0;

  const notificationSupplierId = String(notification.supplierId || '');
  const notificationSupplierName = normalizeKey(notification.supplierName);
  const notificationSupplierContact = normalizeKey(notification.supplierContact);

  if (!hasSupplierIdentity) return true;

  return (
    supplierIds.includes(notificationSupplierId)
    || supplierNames.includes(notificationSupplierName)
    || supplierContacts.includes(notificationSupplierContact)
  );
}

function getSupplierDemandGroupId(notification) {
  return [
    notification.clientId,
    notification.clientEmail,
    notification.projectId,
    notification.supplierId,
    notification.supplierName,
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean).join('|')
    || String(notification.id || '');
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [adminData] = useAdminData();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  function loadWorkspace() {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les analyses fournisseur.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }

  useEffect(() => {
    const cancelLoad = loadWorkspace();
    const unsubscribe = subscribeSupplierWorkspaceChange(() => {
      loadWorkspace();
    });

    return () => {
      cancelLoad();
      unsubscribe();
    };
  }, []);

  const supplierProfile = workspace?.supplier || null;
  const hiddenDemandItemsKey = getHiddenDemandItemsKey(user, supplierProfile);
  const hiddenDemandIds = useMemo(
    () => readHiddenDemandItems(hiddenDemandItemsKey),
    [hiddenDemandItemsKey],
  );

  const products = useMemo(() => workspace?.products || [], [workspace]);
  const adminProducts = useMemo(() => adminData.products || [], [adminData.products]);
  const demands = useMemo(() => (
    (adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => isDemandForSupplier(notification, user, supplierProfile))
      .filter((notification) => !hiddenDemandIds.includes(getSupplierDemandGroupId(notification)))
  ), [adminData.supplierClientNotifications, hiddenDemandIds, supplierProfile, user]);
  const clients = useMemo(() => (
    (adminData.supplierClientNotifications || [])
      .filter((notification) => isDemandForSupplier(notification, user, supplierProfile))
  ), [adminData.supplierClientNotifications, supplierProfile, user]);
  const stats = useMemo(() => {
    const active = products.filter((product) => isEffectivelyPublished(product, adminProducts)).length;
    const published = products.filter((product) => (
      isEffectivelyPublished(product, adminProducts) || isPending(product)
    )).length;
    const total = products.length;

    return {
      total,
      active,
      published,
      clients: clients.length,
    };
  }, [adminProducts, clients.length, products]);

  const dashboardSearchTerm = searchParams.get('q')?.trim().toLowerCase() || '';
  const history = products
    .filter((product) => (
      !dashboardSearchTerm
      || String(product.name || '').toLowerCase().includes(dashboardSearchTerm)
      || String(product.category || '').toLowerCase().includes(dashboardSearchTerm)
      || String(product.availability || '').toLowerCase().includes(dashboardSearchTerm)
      || String(product.publicationStatus || '').toLowerCase().includes(dashboardSearchTerm)
    ))
    .slice(0, 4);
  const monthActivity = useMemo(() => buildMonthActivity(demands), [demands]);
  const activityChart = useMemo(() => buildActivityPath(monthActivity), [monthActivity]);
  const repartitionData = [
    {
      name: 'Articles actifs',
      value: stats.active,
      chartValue: getDonutDisplayValue(stats.active, stats.total),
      percent: getPercent(stats.active, stats.total),
      color: '#5877f7',
      unit: 'article',
    },
    {
      name: 'Articles publiés',
      value: stats.published,
      chartValue: getDonutDisplayValue(stats.published, stats.total),
      percent: getPercent(stats.published, stats.total),
      color: '#ffc865',
      unit: 'article',
    },
    {
      name: 'Clients',
      value: stats.clients,
      chartValue: getDonutDisplayValue(stats.clients, Math.max(stats.total, stats.clients)),
      percent: getPercent(stats.clients, Math.max(stats.total, stats.clients)),
      color: '#22c55e',
      unit: 'client',
    },
    {
      name: 'Total articles',
      value: stats.total,
      chartValue: getDonutDisplayValue(stats.total, stats.total),
      percent: stats.total ? 100 : 0,
      color: '#1d0870',
      unit: 'article',
    },
  ];

  function handleStatKeyDown(event, route) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigate(route);
  }

  return (
    <div className="dashboard-page supplier-dashboard-page">
      <div className="dashboard-grid">
        <section id="supplier-products-summary" className="dashboard-stats" aria-label="Résumé des articles fournisseur">
          <article
            className="stat-card stat-blue stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/supplier/products')}
            onKeyDown={(event) => handleStatKeyDown(event, '/supplier/products')}
          >
            <Text as="span" variant="bold" size="sm">
              Articles actifs
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
            onClick={() => navigate('/supplier/products')}
            onKeyDown={(event) => handleStatKeyDown(event, '/supplier/products')}
          >
            <Text as="span" variant="bold" size="sm">
              Articles publiés
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.published).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 24 C18 12 24 22 35 18 S50 29 74 7" />
            </svg>
          </article>

          <article
            className="stat-card stat-red stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/supplier/clients')}
            onKeyDown={(event) => handleStatKeyDown(event, '/supplier/clients')}
          >
            <Text as="span" variant="bold" size="sm">
              Clients
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.clients).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 22 C13 17 19 27 30 20 S46 10 55 19 S66 9 74 13" />
            </svg>
          </article>

          <article
            className="stat-card stat-cyan stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/supplier/products')}
            onKeyDown={(event) => handleStatKeyDown(event, '/supplier/products')}
          >
            <Text as="span" variant="bold" size="sm">
              Total articles
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
            <h1>Activité des demandes</h1>
            <Text as="span" variant="bold" size="sm">
              Demandes
            </Text>
          </div>
          <div className="line-chart" aria-label="Graphique d'activité fournisseur">
            <svg viewBox="0 0 420 210" role="img">
              <defs>
                <linearGradient id="supplierActivityFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffac4a" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#ffac4a" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                className="chart-fill supplier-chart-fill"
                d={activityChart.fillPath}
              />
              <path
                className="chart-line"
                d={activityChart.linePath}
              />
              {activityChart.points.map((point) => (
                <circle key={point.key} cx={point.x} cy={point.y} r={point.count ? 5 : 3} />
              ))}
            </svg>
            <div className="chart-axis">
              {monthActivity.map((item, index) => (
                <Text as="span" size="sm" key={`${item.label}-${index}`}>
                  {item.label}
                </Text>
              ))}
            </div>
            <div className="chart-legend">
              
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> Demandes</Text>
            </div>
          </div>
        </section>

        <section id="supplier-product-history" className="dashboard-panel history-panel">
          <div className="panel-heading row-heading">
            <h2>Articles récents</h2>
            <Text as="span" variant="bold" size="sm">
              Filtrer par date : Tout
            </Text>
          </div>
          {isLoading ? (
            <Loader label="Chargement des articles..." />
          ) : error ? (
            <Text className="muted history-empty">{error}</Text>
          ) : history.length === 0 ? (
            <Text className="muted history-empty">Aucun article enregistré pour le moment.</Text>
          ) : (
            <ul className="history-list">
              {history.map((product, index) => (
                <li key={`${product.id || product.name}-${index}`}>
                  <button
                    type="button"
                    onClick={() => navigate(product.id ? `/supplier/products/new?edit=${product.id}` : '/supplier/products')}
                  >
                    <span className={`history-icon history-icon-${index + 1}`} aria-hidden="true" />
                    <div>
                      <Text as="strong" variant="bold" size="sm">
                        {product.name}
                      </Text>
                      <Text as="span" variant="bold" size="sm">
                        {getEffectiveProductStatusLabel(product, adminProducts)} ·{' '}
                        {formatDate(product.updatedAt || product.createdAt)}
                      </Text>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="supplier-products-repartition" className="dashboard-panel repartition-panel">
          <DonutChartCard title="Répartition" data={repartitionData} />
        </section>
      </div>
      <div className="dashboard-new-project">
        <Button
          type="button"
          size="lg"
          icon={<Icon name="Add" />}
          onClick={() => navigate('/supplier/products/new')}
        >
          Ajouter un produit
        </Button>
      </div>
    </div>
  );
}
