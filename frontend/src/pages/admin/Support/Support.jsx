import '../../user/Support/Support.css';
import './Support.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { deleteAdminSupportItem, fetchAdminSupportItems, updateAdminSupportItem } from '../../../services/adminMongo';
import SupportModal from './supportModal';

const SUPPORT_REFRESH_INTERVAL = 10000;

function getStatusTone(status) {
  if (status === 'Ouvert') return 'danger';
  if (status === 'En cours') return 'warning';
  return 'success';
}

export default function Support() {
  const [searchParams] = useSearchParams();
  const [remoteSupportItems, setRemoteSupportItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});

  useEffect(() => {
    let cancelled = false;

    function loadSupportItems({ silent = false } = {}) {
      fetchAdminSupportItems()
        .then((list) => {
          if (!cancelled) {
            setRemoteSupportItems(list);
            setError('');
          }
        })
        .catch((apiError) => {
          if (!cancelled && !silent) setError(getApiErrorMessage(apiError, 'Impossible de charger les demandes support Mongo.'));
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }

    loadSupportItems();
    const refreshTimer = window.setInterval(() => loadSupportItems({ silent: true }), SUPPORT_REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const feedbackItems = useMemo(() => {
    const normalizedSearch = (searchParams.get('q') || '').trim().toLowerCase();

    return remoteSupportItems.filter((item) => {
      const matchesTab = item.tab === 'feedback'
        && Boolean(item.userId)
        && ['user', 'supplier'].includes(item.sourceRole);
      const matchesSearch = !normalizedSearch
        || String(item.subject || '').toLowerCase().includes(normalizedSearch)
        || String(item.user || '').toLowerCase().includes(normalizedSearch)
        || String(item.email || '').toLowerCase().includes(normalizedSearch)
        || String(item.description || '').toLowerCase().includes(normalizedSearch);

      return matchesTab && matchesSearch;
    });
  }, [searchParams, remoteSupportItems]);

  const replyDraft = selectedItem?.id
    ? replyDrafts[selectedItem.id] ?? selectedItem.reply ?? ''
    : '';

  function patchSupportItemLocally(itemId, patch) {
    setRemoteSupportItems((currentItems) => currentItems.map((item) => (
      item.id === itemId ? { ...item, ...patch } : item
    )));
  }

  function removeSupportItemLocally(itemId) {
    setRemoteSupportItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    if (selectedItem?.id === itemId) setSelectedItem(null);
  }

  async function deleteSupportItem(item) {
    if (!item?.id) return;

    const previousRemoteItems = remoteSupportItems;

    removeSupportItemLocally(item.id);

    try {
      await deleteAdminSupportItem(item.id);
      setError('');
      setSuccessMessage('Feedback supprimé.');
    } catch (apiError) {
      setRemoteSupportItems(previousRemoteItems);
      setError(getApiErrorMessage(apiError, 'La suppression du feedback a échoué.'));
    }
  }

  async function updateSelectedItem(patch) {
    if (!selectedItem?.id) return;

    const previousRemoteItems = remoteSupportItems;
    const optimisticItem = { ...selectedItem, ...patch };

    patchSupportItemLocally(selectedItem.id, patch);
    setSelectedItem(optimisticItem);

    try {
      const updatedItem = await updateAdminSupportItem(selectedItem.id, patch);
      setRemoteSupportItems((currentItems) => currentItems.map((item) => (
        item.id === updatedItem.id ? updatedItem : item
      )));
      setSelectedItem(updatedItem);
      setReplyDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[updatedItem.id];
        return nextDrafts;
      });
      setError('');
      setSuccessMessage(patch.reply !== undefined ? 'Réponse envoyée.' : 'Feedback mis à jour.');
    } catch (apiError) {
      setRemoteSupportItems(previousRemoteItems);
      setSelectedItem(selectedItem);
      setError(getApiErrorMessage(apiError, "La mise à jour de la demande support a échoué."));
    }
  }

  return (
    <main className="user-support-page admin-support-page">
      <section className="user-support-panel admin-support-main">
        <header className="user-support-header admin-support-header">
          <div>
            <span>Assistance</span>
            <h1>Support</h1>
          </div>
        </header>

        {error && (
          <Alert variant="danger" className="admin-support-alert" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" className="admin-support-alert" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        <section className="user-support-card admin-support-card">
          <h2>Feedbacks reçus</h2>
          {isLoading ? (
            <Alert variant="info">Chargement des feedbacks...</Alert>
          ) : feedbackItems.length ? (
            <div className="user-support-list admin-support-list">
              {feedbackItems.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setSelectedItem(item);
                  }}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <span>{item.user} · {item.date}</span>
                    <small>{item.description}</small>
                  </div>
                  <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                  <button
                    type="button"
                    className="user-support-list__delete"
                    aria-label={`Supprimer ${item.subject}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteSupportItem(item);
                    }}
                  >
                    <Icon name="Delete" size="sm" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Alert variant="info">Aucun feedback reçu.</Alert>
          )}
        </section>
      </section>

      {selectedItem && (
        <SupportModal
          item={selectedItem}
          replyDraft={replyDraft}
          onReplyChange={(value) => {
            setReplyDrafts((currentDrafts) => ({
              ...currentDrafts,
              [selectedItem.id]: value,
            }));
          }}
          onClose={() => setSelectedItem(null)}
          onUpdate={updateSelectedItem}
        />
      )}
    </main>
  );
}
