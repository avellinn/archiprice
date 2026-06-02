import './Support.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Icon } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { fetchAdminSupportItems, updateAdminSupportItem } from '../../../services/adminMongo';
import { Badge } from '../PageShell';

const SUPPORT_TABS = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'priceReports', label: 'Signalements prix' },
];

const STATUS_OPTIONS = ['Tous', 'Ouvert', 'En cours', 'Résolu'];
const TYPE_OPTIONS = ['Tous', 'Bug', 'Prix', 'Question', 'Suggestion', 'Avis', 'Signalement prix'];

function getStatusTone(status) {
  if (status === 'Ouvert') return 'danger';
  if (status === 'En cours') return 'warning';
  return 'success';
}

export default function Support() {
  const [searchParams] = useSearchParams();
  const [supportItems, setSupportItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [typeFilter, setTypeFilter] = useState('Tous');

  useEffect(() => {
    let cancelled = false;

    fetchAdminSupportItems()
      .then((list) => {
        if (!cancelled) {
          setSupportItems(list);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les demandes support Mongo.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeItems = useMemo(() => {
    const normalizedSearch = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();

    return supportItems.filter((item) => {
      const matchesTab = item.tab === activeTab;
      const matchesSearch = !normalizedSearch
        || String(item.subject || '').toLowerCase().includes(normalizedSearch)
        || String(item.user || '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'Tous' || item.status === statusFilter;
      const matchesType = typeFilter === 'Tous' || item.type === typeFilter;

      return matchesTab && matchesSearch && matchesStatus && matchesType;
    });
  }, [activeTab, searchParams, searchTerm, statusFilter, supportItems, typeFilter]);

  const selectedItem = useMemo(() => (
    supportItems.find((item) => item.id === selectedItemId && item.tab === activeTab)
    || activeItems[0]
    || supportItems.find((item) => item.tab === activeTab)
    || supportItems[0]
  ), [activeItems, activeTab, selectedItemId, supportItems]);

  const replyDraft = selectedItem?.id
    ? replyDrafts[selectedItem.id] ?? selectedItem.reply ?? ''
    : '';

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    const firstItem = supportItems.find((item) => item.tab === tabId);
    if (firstItem) setSelectedItemId(firstItem.id);
  }

  async function updateSelectedItem(patch) {
    if (!selectedItem?.id) return;

    const previousItems = supportItems;
    setSupportItems((currentItems) => currentItems.map((item) => (
      item.id === selectedItem.id ? { ...item, ...patch } : item
    )));

    try {
      const updatedItem = await updateAdminSupportItem(selectedItem.id, patch);
      setSupportItems((currentItems) => currentItems.map((item) => (
        item.id === updatedItem.id ? updatedItem : item
      )));
      setReplyDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[updatedItem.id];
        return nextDrafts;
      });
      setError('');
    } catch (apiError) {
      setSupportItems(previousItems);
      setError(getApiErrorMessage(apiError, "La mise à jour de la demande support a échoué."));
    }
  }

  return (
    <div className="admin-support-page">
      <section className="admin-support-main">
        <header className="admin-support-header">
          <h1>Support</h1>
          {error && <p className="admin-products-empty">{error}</p>}

          <nav className="admin-support-tabs" aria-label="Sections support">
            {SUPPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="admin-support-toolbar">
          <label className="admin-support-search">
            <Icon name="Search" size="sm" />
            <span className="visually-hidden">Rechercher un ticket</span>
            <input
              type="search"
              placeholder="Rechercher un ticket..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="admin-support-select">
            <span>Statut :</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((status, index) => (
                <option key={`${status}-${index}`} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="admin-support-select">
            <span>Type :</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {TYPE_OPTIONS.map((type, index) => (
                <option key={`${type}-${index}`} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-support-table-card">
          <table className="admin-support-table">
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Utilisateur</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="admin-support-empty">Chargement des demandes support Mongo...</td>
                </tr>
              ) : activeItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-support-empty">Aucune demande trouvée.</td>
                </tr>
              ) : (
                activeItems.map((item, index) => (
                  <tr key={`${item.id || item.subject}-${index}`} className={item.id === selectedItem?.id ? 'is-selected' : ''}>
                    <td>{item.subject}</td>
                    <td>{item.user}</td>
                    <td>
                      <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                    </td>
                    <td>{item.date}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-support-view"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="admin-support-detail" aria-label="Détail du ticket">
        <div className="admin-support-detail__header">
          <h2>Détail du ticket</h2>
          <button type="button" aria-label="Fermer le détail">
            <Icon name="Close" size="sm" />
          </button>
        </div>

        <dl className="admin-support-detail__meta">
          <div>
            <dt>Type</dt>
            <dd>{selectedItem?.type || '-'}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>
              <Badge tone={getStatusTone(selectedItem?.status)}>{selectedItem?.status || '-'}</Badge>
            </dd>
          </div>
          <div>
            <dt>Utilisateur</dt>
            <dd>
              <strong>{selectedItem?.user || '-'}</strong>
              <span>{selectedItem?.email || '-'}</span>
            </dd>
          </div>
          <div>
            <dt>Sujet</dt>
            <dd>{selectedItem?.subject || '-'}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{selectedItem?.description || '-'}</dd>
          </div>
        </dl>

        <label className="admin-support-reply">
          <span>Réponse</span>
          <textarea
            placeholder="Votre réponse..."
            value={replyDraft}
            onChange={(event) => {
              if (!selectedItem?.id) return;
              setReplyDrafts((currentDrafts) => ({
                ...currentDrafts,
                [selectedItem.id]: event.target.value,
              }));
            }}
          />
        </label>

        <div className="admin-support-actions">
          <Button type="button" variant="success" size="sm" disabled={!selectedItem?.id} onClick={() => updateSelectedItem({ reply: replyDraft, status: 'Résolu' })}>
            Fermer le ticket
          </Button>
          <Button type="button" size="md" disabled={!selectedItem?.id} onClick={() => updateSelectedItem({ reply: replyDraft, status: 'En cours' })}>
            Envoyer
          </Button>
        </div>
      </aside>
    </div>
  );
}
