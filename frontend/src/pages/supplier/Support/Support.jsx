import './Support.css';
import { useEffect, useMemo, useState } from 'react';
import ModalSupport from '../../../components/modalsupport';
import { Alert, Button, Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { createAdminId, useAdminData } from '../../../services/adminData';
import { createSupportFeedback, fetchMySupportItems } from '../../../services/support';

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

function mergeSupportItems(localItems, remoteItems) {
  const itemsById = new Map();

  [...localItems, ...remoteItems].forEach((item) => {
    if (!item?.id) return;
    const itemId = String(item.id);
    itemsById.set(itemId, {
      ...(itemsById.get(itemId) || {}),
      ...item,
      id: itemId,
    });
  });

  return Array.from(itemsById.values());
}

export default function SupplierSupport() {
  const { user } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [remoteSupportItems, setRemoteSupportItems] = useState([]);
  const [hiddenSupportItemIds, setHiddenSupportItemIds] = useState(readHiddenSupportItems);

  const supplierSettings = adminData?.supplierSettings || {};
  const supplierEmail = user?.email || supplierSettings.shopProfile?.email || '';
  const supplierName = supplierSettings.shopProfile?.name || user?.companyName || user?.name || supplierEmail || 'Fournisseur';
  const supportItems = useMemo(() => (
    mergeSupportItems(adminData?.supportItems || [], remoteSupportItems)
  ), [adminData?.supportItems, remoteSupportItems]);

  const supplierFeedbacks = useMemo(() => (
    supportItems.filter((item) => (
      item.sourceRole === 'supplier'
      && item.tab === 'feedback'
      && !hiddenSupportItemIds.includes(String(item.id))
      && (item.email === supplierEmail || item.userId === user?.id || item.userId === user?._id)
    ))
  ), [hiddenSupportItemIds, supplierEmail, supportItems, user]);

  useEffect(() => {
    let cancelled = false;

    function loadSupportItems() {
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
  }

  async function submitFeedback(comment) {
    const feedback = {
      id: createAdminId('feedback-supplier'),
      tab: 'feedback',
      sourceRole: 'supplier',
      userId: user?.id || user?._id || '',
      subject: `Feedback boutique ${supplierName}`,
      user: supplierName,
      email: supplierEmail,
      status: 'Ouvert',
      type: 'Feedback',
      date: formatDate(new Date()),
      description: comment,
      reply: '',
    };

    updateAdminData((currentData) => ({
      ...currentData,
      supportItems: [feedback, ...(currentData?.supportItems || [])],
    }));
    setIsModalOpen(false);
    setMessage('Merci pour votre Feedback');

    try {
      const remoteFeedback = await createSupportFeedback({
        subject: feedback.subject,
        description: feedback.description,
        type: feedback.type,
        date: feedback.date,
      });
      updateAdminData((currentData) => ({
        ...currentData,
        supportItems: (currentData?.supportItems || []).map((item) => (
          item.id === feedback.id ? remoteFeedback : item
        )),
      }));
    } catch {
      // Le feedback reste synchronisé via la configuration locale/remote si l'API support est indisponible.
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

        <section className="supplier-support-card">
          <h2>Feedbacks boutique</h2>
          {supplierFeedbacks.length ? (
            <div className="supplier-support-list">
              {supplierFeedbacks.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.subject}</strong>
                    <span>{item.date}</span>
                    {item.reply && <small>Réponse admin : {item.reply}</small>}
                  </div>
                  <b>{item.status}</b>
                  {item.reply && (
                    <button
                      type="button"
                      className="supplier-support-list__delete"
                      title="Supprimer de ma liste"
                      aria-label={`Supprimer ${item.subject} de ma liste`}
                      onClick={() => hideSupportItem(item.id)}
                    >
                      <Icon name="Delete" size="sm" />
                    </button>
                  )}
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
    </main>
  );
}
