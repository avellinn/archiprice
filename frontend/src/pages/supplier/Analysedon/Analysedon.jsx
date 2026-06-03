import './Analysedon.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DonutChartCard from '../../../components/DonutChart';
import { Button, Icon, Text } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { fetchSupplierWorkspace, subscribeSupplierWorkspaceChange } from '../../../services/supplier';

const MONTH_ACTIVITY = [
  { label: 'Jan', value: 14 },
  { label: 'Fév', value: 22 },
  { label: 'Mar', value: 18 },
  { label: 'Avr', value: 34 },
  { label: 'Mai', value: 42 },
  { label: 'Juin', value: 58 },
  { label: 'Juil', value: 51 },
  { label: 'Août', value: 66 },
];

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

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isPublished(product) {
  const publicationStatus = normalizeStatus(product.publicationStatus || product.statusPublication);
  const status = normalizeStatus(product.status);

  return ['validé', 'valide', 'approved', 'published', 'publié', 'publie'].includes(publicationStatus)
    || ['approved', 'published', 'publié', 'publie'].includes(status);
}

function isPending(product) {
  const publicationStatus = normalizeStatus(product.publicationStatus || product.statusPublication);
  const status = normalizeStatus(product.status);

  return ['en attente', 'pending', 'submitted', 'soumis'].includes(publicationStatus)
    || ['pending', 'submitted'].includes(status);
}

function isActive(product) {
  const status = normalizeStatus(product.status);
  const availability = normalizeStatus(product.availability);

  return !['archived', 'archive', 'archivé', 'rejected', 'refusé', 'refuse'].includes(status)
    && !['rupture', 'non disponible'].includes(availability);
}

function getProductStatusLabel(product) {
  if (isPublished(product)) return 'Publié';
  if (isPending(product)) return 'En attente';

  const status = normalizeStatus(product.status);
  return STATUS_COPY[status] || product.status || product.availability || 'Brouillon';
}

export default function Analysedon() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const products = useMemo(() => workspace?.products || [], [workspace]);
  const stats = useMemo(() => {
    const published = products.filter(isPublished).length;
    const pending = products.filter(isPending).length;
    const active = products.filter(isActive).length;

    return {
      total: products.length,
      active,
      published,
      pending,
    };
  }, [products]);

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
      name: 'En attente',
      value: stats.pending,
      chartValue: getDonutDisplayValue(stats.pending, stats.total),
      percent: getPercent(stats.pending, stats.total),
      color: '#22c55e',
      unit: 'article',
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

  return (
    <div className="dashboard-page supplier-dashboard-page">
      <div className="dashboard-grid">
        <section id="supplier-products-summary" className="dashboard-stats" aria-label="Résumé des articles fournisseur">
          <article className="stat-card stat-blue">
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

          <article className="stat-card stat-yellow">
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

          <article className="stat-card stat-red">
            <Text as="span" variant="bold" size="sm">
              En attente
            </Text>
            <Text as="strong" variant="medium" size="lg">
              {String(stats.pending).padStart(2, '0')}
            </Text>
            <svg viewBox="0 0 78 34" aria-hidden="true">
              <path d="M4 22 C13 17 19 27 30 20 S46 10 55 19 S66 9 74 13" />
            </svg>
          </article>

          <article className="stat-card stat-cyan">
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
            <h1>Activité des articles</h1>
            <Text as="span" variant="bold" size="sm">
              Ventes vs publications
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
              <Text as="span" variant="bold" size="sm"><i className="legend-blue" /> Ventes</Text>
              <Text as="span" variant="bold" size="sm"><i className="legend-orange" /> Publications</Text>
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
            <Text className="muted history-empty">Chargement des articles...</Text>
          ) : error ? (
            <Text className="muted history-empty">{error}</Text>
          ) : history.length === 0 ? (
            <Text className="muted history-empty">Aucun article enregistré pour le moment.</Text>
          ) : (
            <ul className="history-list">
              {history.map((product, index) => (
                <li key={`${product.id || product.name}-${index}`}>
                  <span className={`history-icon history-icon-${index + 1}`} aria-hidden="true" />
                  <div>
                    <Text as="strong" variant="bold" size="sm">
                      {product.name}
                    </Text>
                    <Text as="span" variant="bold" size="sm">
                      {getProductStatusLabel(product)} ·{' '}
                      {formatDate(product.updatedAt || product.createdAt)}
                    </Text>
                  </div>
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
