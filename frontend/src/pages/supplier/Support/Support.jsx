import './Support.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ModalSupport from '../../../components/modalsupport';
import { Alert, Button, Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { fetchSupplierWorkspace } from '../../../services/supplier';
import { createSupportFeedback, fetchMySupportItems, markSupportItemRead, replyToSupportItem, subscribeSupportChange } from '../../../services/support';
import { useAdminData } from '../../../services/adminData';
import { getSupplierTranslations } from '../../../utils/supplierLanguage';
import SupportModal from '../../admin/Support/supportModal';

const HIDDEN_SUPPORT_ITEMS_KEY = 'archiprice:supplier-support-hidden-items';

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR').format(value ? new Date(value) : new Date());
}

function readHiddenSupportItems() {
  try {
    const storedValue = window.localStorage.getItem(HIDDEN_SUPPORT_ITEMS_KEY);
    return storedValue ? JSON.parse(storedValue).map(String) : [];
  } catch {
    return [];
  }
}

function writeHiddenSupportItems(itemIds) {
  try {
    window.localStorage.setItem(HIDDEN_SUPPORT_ITEMS_KEY, JSON.stringify(itemIds));
  } catch {
    // La suppression reste disponible en mémoire si le stockage navigateur est indisponible.
  }
}

export default function SupplierSupport() {
  const { user } = useAuth();
  const [adminData] = useAdminData();
  const translations = getSupplierTranslations(adminData);
  const text = translations.support;
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [remoteSupportItems, setRemoteSupportItems] = useState([]);
  const [hiddenSupportItemIds, setHiddenSupportItemIds] = useState(readHiddenSupportItems);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});

  const supplierEmail = supplierProfile?.email || user?.email || '';
  const supplierName = supplierProfile?.companyName
    || supplierProfile?.name
    || user?.companyName
    || user?.shopName
    || user?.name
    || supplierEmail
    || 'Fournisseur';

  const supplierFeedbacks = useMemo(() => (
    remoteSupportItems.filter((item) => (
      (!item.sourceRole || item.sourceRole === 'supplier')
      && item.tab === 'feedback'
      && !hiddenSupportItemIds.includes(String(item.id))
    ))
  ), [hiddenSupportItemIds, remoteSupportItems]);

  const loadSupportItems = useCallback(() => {
    fetchSupplierWorkspace()
      .then((workspace) => setSupplierProfile(workspace?.supplier || null))
      .catch(() => {});

    fetchMySupportItems()
      .then(setRemoteSupportItems)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSupportItems();
  }, [loadSupportItems]);

  useRealtimeRefresh(loadSupportItems, ['support-items', 'suppliers']);
  useEffect(() => subscribeSupportChange(loadSupportItems), [loadSupportItems]);

  function hideSupportItem(itemId) {
    const nextHiddenItemIds = Array.from(new Set([...hiddenSupportItemIds, String(itemId)]));
    setHiddenSupportItemIds(nextHiddenItemIds);
    writeHiddenSupportItems(nextHiddenItemIds);
    if (selectedFeedback?.id === itemId) setSelectedFeedback(null);
    setMessage('Feedback supprimé de votre liste.');
  }

  function openFeedback(item) {
    setSelectedFeedback(item);
    if (Number(item.unreadForOwner) > 0) markSupportItemRead(item.id).catch(() => {});
  }

  async function submitFeedback(comment) {
    const feedback = {
      subject: `Feedback boutique ${supplierName}`,
      type: 'Feedback',
      date: formatDate(new Date()),
      description: comment,
    };

    try {
      const remoteFeedback = await createSupportFeedback({
        subject: feedback.subject,
        description: feedback.description,
        type: feedback.type,
        date: feedback.date,
      });
      setRemoteSupportItems((currentItems) => [remoteFeedback, ...currentItems]);
      setIsModalOpen(false);
      setMessage(text.sent);
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "L'envoi du feedback a échoué. Vérifiez que le backend est démarré."));
    }
  }

  async function replyToFeedback(patch) {
    if (!selectedFeedback?.id || !patch?.reply) return;

    try {
      const remoteFeedback = await replyToSupportItem(selectedFeedback.id, patch.reply);
      setRemoteSupportItems((currentItems) => currentItems.map((item) => (
        item.id === remoteFeedback.id ? remoteFeedback : item
      )));
      setReplyDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[selectedFeedback.id];
        return nextDrafts;
      });
      setSelectedFeedback(remoteFeedback);
      setMessage(text.replySent);
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "L'envoi de la réponse a échoué."));
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
          <Button type="button" icon={<Icon name="Chat" size="sm" />} onClick={() => setIsModalOpen(true)}>
            {text.leaveComment}
          </Button>
        </header>

        {message && (
          <Alert variant="success" onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <section className="supplier-support-card">
          <h2>{text.listTitle}</h2>
          {supplierFeedbacks.length ? (
            <div className="supplier-support-list">
              {supplierFeedbacks.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openFeedback(item)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    openFeedback(item);
                  }}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <span>{item.date}</span>
                    {item.reply && <small>{text.adminReply} : {item.reply}</small>}
                  </div>
                  <b>{item.status}</b>
                  <button
                    type="button"
                    className="supplier-support-list__delete"
                    title={text.delete}
                    aria-label={`Supprimer ${item.subject} de ma liste`}
                    onClick={(event) => {
                      event.stopPropagation();
                      hideSupportItem(item.id);
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

      {isModalOpen && (
        <ModalSupport
          title={text.leaveComment}
          placeholder={text.placeholder}
          labels={{ ...text, ...translations.common }}
          onCancel={() => setIsModalOpen(false)}
          onSubmit={submitFeedback}
        />
      )}

      {selectedFeedback && (
        <SupportModal
          labels={translations.common}
          item={selectedFeedback}
          replyDraft={replyDrafts[selectedFeedback.id] ?? ''}
          onReplyChange={(value) => {
            setReplyDrafts((currentDrafts) => ({
              ...currentDrafts,
              [selectedFeedback.id]: value,
            }));
          }}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={replyToFeedback}
        />
      )}
    </main>
  );
}
