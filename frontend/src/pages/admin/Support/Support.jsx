import '../../supplier/Support/Support.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Icon, Loader } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { deleteAdminSupportItem, fetchAdminSupportItems, updateAdminSupportItem } from '../../../services/adminMongo';
import { subscribeSupportChange } from '../../../services/support';
import SupportModal from './supportModal';
import { useAdminData } from '../../../services/adminData';
import { getAdminTranslations } from '../../../utils/adminLanguage';

export default function Support() {
  const [adminData] = useAdminData();
  const translations = getAdminTranslations(adminData);
  const text = translations.support;
  const [searchParams] = useSearchParams();
  const [remoteSupportItems, setRemoteSupportItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});

  const loadSupportItems = useCallback(({ silent = false } = {}) => {
    fetchAdminSupportItems()
      .then((list) => {
        setRemoteSupportItems(list);
        setError('');
      })
      .catch((apiError) => {
        if (!silent) setError(getApiErrorMessage(apiError, 'Impossible de charger les demandes support Mongo.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadSupportItems();
  }, [loadSupportItems]);

  useRealtimeRefresh(() => loadSupportItems({ silent: true }), ['support-items']);
  useEffect(() => subscribeSupportChange(() => loadSupportItems({ silent: true })), [loadSupportItems]);

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
      setSuccessMessage(text.deleted);
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
      setSuccessMessage(patch.reply !== undefined ? text.replySent : text.updated);
    } catch (apiError) {
      setRemoteSupportItems(previousRemoteItems);
      setSelectedItem(selectedItem);
      setError(getApiErrorMessage(apiError, "La mise à jour de la demande support a échoué."));
    }
  }

  return (
    <main className="supplier-support-page">
      <section className="supplier-support-panel">
        <header className="supplier-support-header">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
          </div>
        </header>

        {error && (
          <Alert variant="danger" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        <section className="supplier-support-card">
          <h2>{text.listTitle}</h2>
          {isLoading ? (
            <Loader label={text.loading} />
          ) : feedbackItems.length ? (
            <div className="supplier-support-list">
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
                  <b>{item.status}</b>
                  <button
                    type="button"
                    className="supplier-support-list__delete"
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
            <Alert variant="info">{text.empty}</Alert>
          )}
        </section>
      </section>

      {selectedItem && (
        <SupportModal
          labels={translations.common}
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
