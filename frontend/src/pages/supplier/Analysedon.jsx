import { useEffect, useMemo, useState } from 'react';
import { Button, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import { fetchSupplierWorkspace } from '../../services/supplier';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function MetricCard({ title, value, suffix = '—' }) {
  return (
    <article className="analysedon-metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{suffix}</small>
      <i aria-hidden="true" />
    </article>
  );
}

function EmptyPanel({ title, children }) {
  return (
    <section className="analysedon-panel analysedon-empty-panel">
      <h2>{title}</h2>
      <div className="analysedon-empty-content">{children}</div>
    </section>
  );
}

function LineChartPanel({ title, value, compact = false }) {
  const axisLabels = compact ? ['00 h', '04 h', '08 h', '12 h', '16 h', '20 h'] : ['00 h', '02 h', '04 h', '06 h', '08 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h'];

  return (
    <section className={`analysedon-panel analysedon-chart-panel ${compact ? 'analysedon-chart-panel--compact' : ''}`}>
      <h2>{title}</h2>
      <strong>{value}</strong>
      <span className="analysedon-chart-dash">—</span>
      <div className="analysedon-line-chart" aria-label={title}>
        <div className="analysedon-y-axis">
          <span>10 F CFA</span>
          <span>5 F CFA</span>
          <span>0 F CFA</span>
        </div>
        <div className="analysedon-chart-stage">
          <i className="analysedon-grid-line analysedon-grid-line--top" />
          <i className="analysedon-grid-line analysedon-grid-line--middle" />
          <i className="analysedon-chart-line" />
          <i className="analysedon-chart-line analysedon-chart-line--dashed" />
        </div>
        <div className="analysedon-x-axis">
          {axisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
      <div className="analysedon-legend">
        <span><i /> 1 juin 2026</span>
        <span><i /> 31 mai 2026</span>
      </div>
    </section>
  );
}

export default function Analysedon() {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() => formatTime());

  useEffect(() => {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
          setLastUpdated(formatTime());
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les analyses.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const products = useMemo(() => workspace?.products || [], [workspace]);
  const analytics = useMemo(() => {
    const productSales = products.map((product) => Number(product.salesTotal || product.revenue || 0));
    const grossSales = productSales.reduce((sum, value) => sum + value, 0);
    const orders = Number(workspace?.stats?.orders || 0);
    const visits = Math.max(Number(workspace?.stats?.visits || 0), products.length ? 2 : 0);

    return {
      grossSales,
      recurringRate: Number(workspace?.stats?.recurringRate || 0),
      processedOrders: Number(workspace?.stats?.processedOrders || orders),
      orders,
      visits,
      averageBasket: orders ? grossSales / orders : 0,
    };
  }, [products, workspace]);

  const salesBreakdown = [
    ['Ventes brutes', analytics.grossSales],
    ['Réductions', 0],
    ['Retours', 0],
    ['Ventes nettes', analytics.grossSales],
    ["Frais d'expédition", 0],
    ['Frais de retour', 0],
    ['Taxes', 0],
    ['Ventes totales', analytics.grossSales],
  ];

  return (
    <div className="analysedon-page">
      <header className="analysedon-header">
        <div className="analysedon-title-row">
          <div>
            <h1><Icon name="Dashboard" size="sm" /> Analyses de données</h1>
            <span>Dernière actualisation : {lastUpdated}</span>
          </div>
          <div className="analysedon-actions">
            <button type="button" className="analysedon-icon-button" aria-label="Plus d'options">•••</button>
            <Button type="button" variant="outline" size="sm">Créer un objectif</Button>
            <Button type="button" size="sm">Nouvelle exploration</Button>
          </div>
        </div>

        <div className="analysedon-filters">
          <button type="button"><Icon name="History" size="sm" /> Aujourd’hui <Icon name="ChevronDown" size="sm" /></button>
          <button type="button"><Icon name="History" size="sm" /> 31 mai 2026 <Icon name="ChevronDown" size="sm" /></button>
          <button type="button">XOF F CFA</button>
        </div>
      </header>

      {isLoading && <section className="analysedon-panel">Chargement des analyses...</section>}
      {error && <section className="analysedon-panel auth-error">{error}</section>}

      {!isLoading && !error && (
        <>
          <section className="analysedon-metric-grid">
            <MetricCard title="Ventes brutes" value={formatFCFA(analytics.grossSales)} />
            <MetricCard title="Taux de clients récurrents" value={`${analytics.recurringRate} %`} />
            <MetricCard title="Commandes traitées" value={analytics.processedOrders} />
            <MetricCard title="Commandes" value={analytics.orders} />
          </section>

          <section className="analysedon-main-grid">
            <LineChartPanel title="Ventes totales au fil du temps" value={formatFCFA(analytics.grossSales)} />

            <section className="analysedon-panel analysedon-breakdown">
              <h2>Ventilation des ventes totales</h2>
              <div className="analysedon-breakdown-list">
                {salesBreakdown.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{formatFCFA(value)}</strong>
                    <small>—</small>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <section className="analysedon-secondary-grid">
            <EmptyPanel title="Ventes totales par canal de vente">
              Aucune donnée pour cette plage de dates
            </EmptyPanel>
            <LineChartPanel title="Valeur moyenne du panier au fil du temps" value={formatFCFA(analytics.averageBasket)} compact />
            <EmptyPanel title="Ventes totales par produit">
              {products.length === 0 ? 'Aucune donnée pour cette plage de dates' : `${products.length} produit(s) dans la boutique`}
            </EmptyPanel>
          </section>

          <section className="analysedon-secondary-grid analysedon-secondary-grid--bottom">
            <LineChartPanel title="Visites au fil du temps" value={analytics.visits} compact />
            <LineChartPanel title="Taux de conversion au fil du temps" value="0 %" compact />
            <section className="analysedon-panel analysedon-conversion">
              <h2>Ventilation du taux de conversion</h2>
              <strong>0 %</strong>
              <span>—</span>
              <div>
                <article><small>Visites</small><b>{analytics.visits > 0 ? '100 %' : '0 %'}</b></article>
                <article><small>Ajouté au panier</small><b>0 %</b></article>
                <article><small>Paiement atteint</small><b>0 %</b></article>
                <article><small>Paiement finalisé</small><b>0 %</b></article>
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
