import './Archives.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Icon, Text } from '../../../components/ui';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import {
  deleteSimulationExport,
  fetchMySimulationExports,
} from '../../../services/simulationExports';
import { getStoredUserLanguage, getUserTranslations } from '../../../utils/userLanguage';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatFCFA(amount) {
  const raw = String(amount || '').replace(/[^\d.-]/g, '').replace(',', '.');
  const num = Number(raw);
  return `${new Intl.NumberFormat('fr-FR').format(Number.isFinite(num) ? num : 0)} FCFA`;
}

function formatDateLong(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateShort(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getStatusLabel(status) {
  const map = {
    draft: 'Brouillon',
    active: 'En cours',
    treated: 'Traité',
    archived: 'Terminé',
  };
  return map[String(status || '').toLowerCase()] || status || '-';
}

function countSuppliers(items = []) {
  return new Set(
    items.map((item) => String(item?.shop || item?.supplier || '').trim()).filter(Boolean),
  ).size;
}

/* ── Fiche modale de simulation ──────────────────────────────────────────── */

function SimulationDetailModal({ sim, onClose, onDelete, navigate }) {
  const exportDate = sim.exportedAt || sim.createdAt;
  const supplierCount = countSuppliers(sim.items);

  function handleKeyDown(event) {
    if (event.key === 'Escape') onClose();
  }

  return (
    <div
      className="sim-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-detail-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="sim-detail-card">
        {/* ── Header ── */}
        <header className="sim-detail-header">
          <div>
            <span className="sim-detail-eyebrow">
              Simulation · Réf. {sim.reference || String(sim.id || '').slice(-8).toUpperCase()}
            </span>
            <h2 id="sim-detail-title">{sim.projectName || 'Simulation'}</h2>
          </div>
          <button type="button" className="sim-detail-close" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="sim-detail-body">
          {/* ── Infos générales ── */}
          <section className="sim-detail-section">
            <h3>Informations générales</h3>
            <dl className="sim-detail-dl">
              <div>
                <dt>Exportée le</dt>
                <dd>{formatDateLong(exportDate)}</dd>
              </div>
              <div>
                <dt>Exportée par</dt>
                <dd>{sim.exportedBy || '-'}</dd>
              </div>
              <div>
                <dt>Statut du projet</dt>
                <dd>
                  <span className={`sim-detail-status sim-detail-status--${String(sim.projectStatus || 'draft').toLowerCase()}`}>
                    {getStatusLabel(sim.projectStatus)}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Résumé financier ── */}
          <section className="sim-detail-section">
            <h3>Résumé financier</h3>
            <div className="sim-detail-finance">
              <div className="sim-detail-finance__cell">
                <span>Budget cible</span>
                <strong>{sim.budget ? formatFCFA(sim.budget) : 'Non renseigné'}</strong>
              </div>
              <div className="sim-detail-finance__cell">
                <span>Budget exporté</span>
                <strong>{formatFCFA(sim.estimatedTotal ?? sim.total)}</strong>
              </div>
              <div className="sim-detail-finance__cell">
                <span>Articles</span>
                <strong>{sim.articleCount ?? sim.products ?? (sim.items?.length || 0)}</strong>
              </div>
              <div className="sim-detail-finance__cell">
                <span>Fournisseurs</span>
                <strong>{supplierCount || '-'}</strong>
              </div>
            </div>
          </section>

          {/* ── Articles exportés ── */}
          {Array.isArray(sim.items) && sim.items.length > 0 && (
            <section className="sim-detail-section">
              <h3>Articles exportés</h3>
              <div className="sim-detail-items-scroll">
                <table className="sim-detail-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Fournisseur</th>
                      <th>Qté</th>
                      <th>Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.items.map((item, index) => (
                      <tr key={`${item.name}-${index}`}>
                        <td>{item.name || '-'}</td>
                        <td>{item.shop || item.supplier || '-'}</td>
                        <td>{item.quantity ?? 1}</td>
                        <td>{item.price || formatFCFA(item.rawPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* ── Actions ── */}
        <footer className="sim-detail-footer">
          <div className="sim-detail-footer__left">
            <Button
              type="button"
              variant="danger"
              icon={<Icon name="Delete" size="sm" />}
              onClick={() => { onClose(); onDelete(sim); }}
            >
              Supprimer
            </Button>
          </div>
          <div className="sim-detail-footer__right">
            {sim.projectId && (
              <Button
                type="button"
                variant="outline"
                icon={<Icon name="Folder" size="sm" />}
                onClick={() => { onClose(); navigate(`/espacepro?projectId=${sim.projectId}`); }}
              >
                Ouvrir le projet
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Fermer
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────────────── */

export default function SimulationExport() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(getStoredUserLanguage);
  const translations = getUserTranslations(language);
  const archiveText = translations.archives;

  const [simulations, setSimulations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSim, setSelectedSim] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isPendingReset, setIsPendingReset] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const sync = () => setLanguage(getStoredUserLanguage());
    window.addEventListener('archiprice:user-profile-change', sync);
    return () => window.removeEventListener('archiprice:user-profile-change', sync);
  }, []);

  const loadSimulations = useCallback(({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    fetchMySimulationExports()
      .then(setSimulations)
      .catch(() => setSimulations([]))
      .finally(() => { if (!silent) setIsLoading(false); });
  }, []);

  useEffect(() => { loadSimulations(); }, [loadSimulations]);
  useRealtimeRefresh(() => loadSimulations({ silent: true }), ['simulation-exports']);

  async function confirmDelete() {
    const sim = pendingDelete;
    if (!sim?.id) return;
    try {
      await deleteSimulationExport(String(sim.id));
      setSimulations((prev) => prev.filter((s) => String(s.id) !== String(sim.id)));
      setPendingDelete(null);
      setActionMessage('Simulation supprimée.');
    } catch {
      setActionError('Impossible de supprimer cette simulation.');
      setPendingDelete(null);
    }
  }

  async function confirmResetAll() {
    const toDelete = [...simulations];
    // Suppression optimiste immédiate pour l'UX
    setSimulations([]);
    setIsPendingReset(false);

    try {
      // Suppression réelle côté serveur — toutes les simulations en parallèle
      await Promise.allSettled(
        toDelete.map((sim) => deleteSimulationExport(String(sim.id))),
      );
      setActionMessage(`${toDelete.length} simulation${toDelete.length > 1 ? 's' : ''} supprimée${toDelete.length > 1 ? 's' : ''}.`);
    } catch {
      setActionError('Certaines simulations n\'ont pas pu être supprimées du serveur.');
    }
  }

  function openDetail(sim) {
    setSelectedSim(sim);
  }

  function handleItemKeyDown(event, sim) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetail(sim);
    }
  }

  return (
    <div className="workspace-page invoices-page">
      {/* ── En-tête ── */}
      <div className="workspace-heading invoices-page__heading">
        <div>
          <h1>Simulations exportées</h1>
          <p className="invoices-page__subtitle">
            Retrouvez ici toutes les simulations PDF générées depuis votre espace de travail.
          </p>
        </div>
        <div className="invoices-page__actions">
          {simulations.length > 0 && (
            <Button
              type="button"
              variant="danger"
              icon={<Icon name="Delete" size="sm" />}
              onClick={() => setIsPendingReset(true)}
            >
              Réinitialiser
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            icon={<Icon name="ArrowLeft" size="sm" />}
            onClick={() => navigate('/archives')}
          >
            Archives
          </Button>
        </div>
      </div>

      

      {/* ── Alertes ── */}
      {actionMessage && (
        <Alert variant="success" layout="inline" autoCloseMs={4000} onClose={() => setActionMessage('')}>
          {actionMessage}
        </Alert>
      )}
      {actionError && (
        <Alert variant="danger" layout="inline" autoCloseMs={5000} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

      {/* ── Liste avec scroll interne ── */}
      <div className="invoices-list-scroll-wrapper">
        {isLoading ? (
          <section className="workspace-card invoices-empty">
            <Text className="muted">Chargement des simulations…</Text>
          </section>
        ) : simulations.length === 0 ? (
          <section className="workspace-card invoices-empty">
            <Text as="strong" variant="bold" size="md">Aucune simulation exportée</Text>
            <Text className="muted">
              Vos exports PDF apparaîtront ici après le téléchargement d'un récapitulatif.
            </Text>
          </section>
        ) : (
          <section className="invoices-list" aria-label="Liste des simulations exportées">
            {simulations.map((sim) => {
              const displayName = sim.projectName || sim.reference || 'Simulation';
              const exportDate = sim.exportedAt || sim.createdAt;

              return (
                <article
                  key={String(sim.id)}
                  className="invoices-list__item invoices-list__item--sim invoices-list__item--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(sim)}
                  onKeyDown={(event) => handleItemKeyDown(event, sim)}
                >
                  {/* Icône PDF */}
                  <span className="invoices-list__icon invoices-list__icon--pdf" aria-hidden="true">
                    < Icon name="ReceiptLong" size="sm" />
                  </span>

                  {/* Nom + date */}
                  <div>
                    <h2>{displayName}</h2>
                    <p>Exporté le {formatDateShort(exportDate)}</p>
                  </div>

                 

                  {/* Montant + articles */}
                  <div className="invoices-list__amount">
                    <strong>{formatFCFA(sim.estimatedTotal ?? sim.total)}</strong>
                    <small>
                      {sim.articleCount ?? sim.products ?? 0} article{(sim.articleCount ?? sim.products ?? 0) > 1 ? 's' : ''}
                    </small>
                  </div>

                  {/* Actions */}
                  <div className="invoices-list__actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="invoices-list__action-btn invoices-list__action-btn--delete"
                      aria-label={`Supprimer ${displayName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDelete(sim);
                      }}
                    >
                      <Icon name="Delete" size="sm" />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

     

      {/* ── Fiche de détail ── */}
      {selectedSim && (
        <SimulationDetailModal
          sim={selectedSim}
          navigate={navigate}
          onClose={() => setSelectedSim(null)}
          onDelete={(sim) => { setSelectedSim(null); setPendingDelete(sim); }}
        />
      )}

      {/* ── Modale suppression individuelle ── */}
      {pendingDelete && (
        <div className="archives-delete-modal" role="presentation">
          <section
            className="archives-delete-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-delete-title"
          >
            <Alert variant="danger" title="Supprimer la simulation" layout="inline">
              Cette action est irréversible.
            </Alert>
            <p id="sim-delete-title">
              {pendingDelete.projectName || pendingDelete.reference}
            </p>
            <footer>
              <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
                {archiveText.cancel ?? 'Annuler'}
              </Button>
              <Button type="button" variant="danger" onClick={confirmDelete}>
                {archiveText.confirm ?? 'Supprimer'}
              </Button>
            </footer>
          </section>
        </div>
      )}

      {/* ── Modale reset global ── */}
      {isPendingReset && (
        <div className="archives-delete-modal" role="presentation">
          <section
            className="archives-delete-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-reset-title"
          >
            <Alert variant="danger" title="Réinitialiser les simulations" layout="inline">
              Cette action vide la liste affichée. Elle est irréversible.
            </Alert>
            <p id="sim-reset-title">
              {simulations.length} simulation{simulations.length > 1 ? 's' : ''} seront supprimée{simulations.length > 1 ? 's' : ''}.
            </p>
            <footer>
              <Button type="button" variant="outline" onClick={() => setIsPendingReset(false)}>
                {archiveText.cancel ?? 'Annuler'}
              </Button>
              <Button type="button" variant="danger" onClick={confirmResetAll}>
                Tout supprimer
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
