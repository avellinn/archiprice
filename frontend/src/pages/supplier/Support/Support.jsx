import './Support.css';
import { useEffect, useMemo, useState } from 'react';
import ModalSupport from '../../../components/modalsupport';
import { Alert, Button, Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { fetchSupplierWorkspace } from '../../../services/supplier';
import { createSupportFeedback, fetchMySupportItems } from '../../../services/support';
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
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [remoteSupportItems, setRemoteSupportItems] = useState([]);
  const [hiddenSupportItemIds, setHiddenSupportItemIds] = useState(readHiddenSupportItems);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

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

  useEffect(() => {
    let cancelled = false;

    function loadSupportItems() {
      fetchSupplierWorkspace()
        .then((workspace) => {
          if (!cancelled) setSupplierProfile(workspace?.supplier || null);
        })
        .catch(() => {});

      fetchMySupportItems()
        .then((items) => {
          if (!cancelled) setRemoteSupportItems(items);
        })
        .catch(() => {});
    }

    loadSupportItems();
    const refreshTimer = window.setInterval(loadSupportItems, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  function hideSupportItem(itemId) {
    const nextHiddenItemIds = Array.from(new Set([...hiddenSupportItemIds, String(itemId)]));
    setHiddenSupportItemIds(nextHiddenItemIds);
    writeHiddenSupportItems(nextHiddenItemIds);
    if (selectedFeedback?.id === itemId) setSelectedFeedback(null);
    setMessage('Feedback supprimé de votre liste.');
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
      setMessage('Merci pour votre Feedback');
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "L'envoi du feedback a échoué. Vérifiez que le backend est démarré."));
    }
  }

  return (
    <main className="supplier-support-page">
      <section className="supplier-support-panel">
        <header className="supplier-support-header">
          <div>
            <span>Assistance boutique</span>
            <h1>Support</h1>
          </div>
          <Button type="button" icon={<Icon name="Chat" size="sm" />} onClick={() => setIsModalOpen(true)}>
            Laisser un commentaire
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
          <h2>Feedbacks boutique</h2>
          {supplierFeedbacks.length ? (
            <div className="supplier-support-list">
              {supplierFeedbacks.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFeedback(item)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setSelectedFeedback(item);
                  }}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <span>{item.date}</span>
                    {item.reply && <small>Réponse admin : {item.reply}</small>}
                  </div>
                  <b>{item.status}</b>
                  <button
                    type="button"
                    className="supplier-support-list__delete"
                    title="Supprimer de ma liste"
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
            <Alert variant="info">Aucun feedback fournisseur envoyé pour le moment.</Alert>
          )}
        </section>
      </section>

      {isModalOpen && (
        <ModalSupport
          title="Laisser un commentaire"
          placeholder="Partagez votre feedback sur votre espace fournisseur."
          onCancel={() => setIsModalOpen(false)}
          onSubmit={submitFeedback}
        />
      )}

      {selectedFeedback && (
        <SupportModal
          item={selectedFeedback}
          replyDraft={selectedFeedback.reply || ''}
          onReplyChange={() => {}}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={() => {}}
          canReply={false}
        />
      )}
    </main>
  );
}
