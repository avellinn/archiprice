import './Demandesup.css';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { useAdminData } from '../../../services/adminData';
import { fetchSupplierWorkspace } from '../../../services/supplier';
import { isNumericOnly } from '../../../utils/formInput';

const HIDDEN_SUPPLIER_DEMAND_ITEMS_KEY = 'archiprice:supplier-demand-hidden-items';
const SUPPLIER_DISMISSED_NOTIFICATIONS_KEY = 'archiprice:supplier-dismissed-notifications';
const NOTIFICATIONS_READ_EVENT = 'archiprice:notifications-read-change';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDateTime(value) {
  if (!value) return 'Non renseignée';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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

function writeHiddenDemandItems(storageKey, itemIds) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(itemIds));
  } catch {
    // La suppression reste disponible en mémoire si le stockage navigateur est indisponible.
  }
}

function readDismissedNotificationKeys() {
  try {
    return JSON.parse(window.localStorage.getItem(SUPPLIER_DISMISSED_NOTIFICATIONS_KEY) || '[]').map(String);
  } catch {
    return [];
  }
}

function writeDismissedNotificationKeys(keys) {
  try {
    window.localStorage.setItem(SUPPLIER_DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(keys));
    window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  } catch {
    // Le statut lu reste disponible en mémoire si le stockage navigateur est indisponible.
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

function normalizeDemandMessages(notification) {
  const messages = Array.isArray(notification.messages) && notification.messages.length
    ? notification.messages
    : notification.message
      ? [{
        id: `${notification.id}-initial`,
        senderRole: 'user',
        senderName: notification.clientName || 'Client ArchiPrice',
        message: notification.message,
        createdAt: notification.createdAt,
      }]
      : [];
  const seenMessages = new Set();

  return messages.filter((message) => {
    const messageKey = [
      message.id,
      message.senderRole,
      message.senderName,
      message.message,
      message.createdAt,
    ].map((value) => String(value || '').trim()).join('|');

    if (seenMessages.has(messageKey)) return false;
    seenMessages.add(messageKey);
    return true;
  });
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

function groupDemandsByClient(notifications) {
  const groups = new Map();

  notifications.forEach((notification) => {
    const groupId = getSupplierDemandGroupId(notification);
    const currentGroup = groups.get(groupId);
    const messages = normalizeDemandMessages(notification);
    const createdAt = notification.createdAt || notification.updatedAt || new Date().toISOString();

    if (!currentGroup) {
      groups.set(groupId, {
        ...notification,
        id: groupId,
        sourceNotificationId: notification.id,
        notificationIds: [notification.id],
        createdAt,
        messages,
      });
      return;
    }

    groups.set(groupId, {
      ...currentGroup,
      status: notification.status || currentGroup.status,
      updatedAt: notification.updatedAt || currentGroup.updatedAt,
      sourceNotificationId: notification.id || currentGroup.sourceNotificationId,
      notificationIds: Array.from(new Set([...currentGroup.notificationIds, notification.id].filter(Boolean))),
      messages: [...currentGroup.messages, ...messages],
    });
  });

  return [...groups.values()].map((group) => ({
    ...group,
    messages: normalizeDemandMessages({ ...group, message: '', messages: group.messages }),
  }));
}

function getLastMessage(item) {
  return Array.isArray(item.messages) && item.messages.length > 0 ? item.messages.at(-1) : null;
}

function getDemandReadKeys(item, notifications = [], expectedSenderRole = 'user') {
  const notificationIds = new Set((item.notificationIds || [item.sourceNotificationId]).filter(Boolean).map(String));
  const keys = notifications
    .filter((notification) => notification.type === 'Demande')
    .filter((notification) => notificationIds.has(String(notification.id || '')))
    .map((notification) => ({
      notificationId: notification.id,
      lastMessage: getLastMessage(notification),
    }))
    .filter(({ notificationId, lastMessage }) => notificationId && lastMessage?.senderRole === expectedSenderRole)
    .map(({ notificationId, lastMessage }) => `supplier-demand-${notificationId}-${lastMessage.id}`);

  if (keys.length > 0) return keys;

  const lastMessage = getLastMessage(item);
  return item.sourceNotificationId && lastMessage?.senderRole === expectedSenderRole
    ? [`supplier-demand-${item.sourceNotificationId}-${lastMessage.id}`]
    : [];
}

function hasUnreadClientMessage(item, readKeys, notifications) {
  return getDemandReadKeys(item, notifications, 'user').some((key) => !readKeys.includes(key));
}

export default function Demandesup() {
  const { user } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const [supplierProfile, setSupplierProfile] = useState(null);
  const hiddenDemandItemsKey = getHiddenDemandItemsKey(user, supplierProfile);
  const [hiddenDemandIds, setHiddenDemandIds] = useState(() => readHiddenDemandItems(hiddenDemandItemsKey));
  const [replyDemandId, setReplyDemandId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDemandId, setSelectedDemandId] = useState('');
  const [readNotificationKeys, setReadNotificationKeys] = useState(readDismissedNotificationKeys);

  useEffect(() => {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((workspace) => {
        if (!cancelled) setSupplierProfile(workspace?.supplier || null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hiddenDemandItemsKey) return undefined;

    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setHiddenDemandIds(readHiddenDemandItems(hiddenDemandItemsKey));
      }
    });

    return () => {
      active = false;
    };
  }, [hiddenDemandItemsKey]);

  useEffect(() => {
    function handleReadNotificationChange(event) {
      if (event.type === 'storage' && event.key !== SUPPLIER_DISMISSED_NOTIFICATIONS_KEY) return;
      setReadNotificationKeys(readDismissedNotificationKeys());
    }

    window.addEventListener('storage', handleReadNotificationChange);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, handleReadNotificationChange);

    return () => {
      window.removeEventListener('storage', handleReadNotificationChange);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, handleReadNotificationChange);
    };
  }, []);

  const demands = useMemo(() => (
    groupDemandsByClient((adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => isDemandForSupplier(notification, user, supplierProfile))
      .filter((notification) => !hiddenDemandIds.includes(getSupplierDemandGroupId(notification))))
      .map((notification) => ({
        ...notification,
        createdAtLabel: formatDateTime(notification.createdAt),
      }))
  ), [adminData.supplierClientNotifications, hiddenDemandIds, supplierProfile, user]);

  function hideDemand(itemId) {
    const nextHiddenIds = Array.from(new Set([...hiddenDemandIds, String(itemId)]));
    setHiddenDemandIds(nextHiddenIds);
    writeHiddenDemandItems(hiddenDemandItemsKey, nextHiddenIds);
    if (selectedDemandId === itemId) setSelectedDemandId('');
    setActionMessage('Conversation supprimée de votre liste.');
  }

  function sendReply(event) {
    event.preventDefault();
    const comment = replyText.trim();
    if (!replyDemandId || !comment) return;
    if (isNumericOnly(comment)) {
      setReplyError('Le message doit contenir du texte.');
      setActionMessage('');
      return;
    }

    const now = new Date().toISOString();
    const supplierName = supplierProfile?.companyName
      || supplierProfile?.name
      || user?.companyName
      || user?.shopName
      || user?.name
      || 'Boutique';

    updateAdminData((currentData) => ({
      ...currentData,
      supplierClientNotifications: (currentData.supplierClientNotifications || []).map((notification) => {
        if (notification.id !== replyDemandId) return notification;

        return {
          ...notification,
          status: 'Répondu',
          messages: normalizeDemandMessages(notification).concat([
            {
              id: `message-${Date.now()}`,
              senderRole: 'supplier',
              senderName: supplierName,
              message: comment,
              createdAt: now,
            },
          ]),
          updatedAt: now,
        };
      }),
    }));
    setReplyText('');
    setReplyDemandId('');
    setReplyError('');
    setActionMessage('Message envoyé.');
  }

  const demandNotifications = adminData.supplierClientNotifications || [];
  const selectedDemand = demands.find((item) => item.id === selectedDemandId);
  const unreadDemandCount = demands.filter((item) => (
    hasUnreadClientMessage(item, readNotificationKeys, demandNotifications)
  )).length;

  function markDemandAsRead(item) {
    const keys = getDemandReadKeys(item, demandNotifications, 'user');
    if (keys.length === 0) return;

    const nextKeys = [...new Set([...readNotificationKeys, ...keys])];
    setReadNotificationKeys(nextKeys);
    writeDismissedNotificationKeys(nextKeys);
  }

  function openDemand(itemId) {
    const demand = demands.find((item) => item.id === itemId);
    if (demand) markDemandAsRead(demand);
    setSelectedDemandId(itemId);
  }

  function handleDemandKeyDown(event, itemId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openDemand(itemId);
  }

  return (
    <main className="user-support-page">
      <section className="user-support-panel">
        <header className="user-support-header">
          <div>
            <span>Demandes clients</span>
            {unreadDemandCount > 0 && (
              <strong className="user-demand-notification-badge">
                {unreadDemandCount} nouvelle{unreadDemandCount > 1 ? 's' : ''} demande{unreadDemandCount > 1 ? 's' : ''}
              </strong>
            )}
          </div>
        </header>

        <section className="user-support-card">
          <h2>Demandes reçues</h2>
          {actionMessage && (
            <Alert variant="success" className="user-demand-action-alert" onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          )}
          {demands.length ? (
            <div className="user-support-list user-demand-list">
              {demands.map((item) => {
                const isUnread = hasUnreadClientMessage(item, readNotificationKeys, demandNotifications);

                return (
                <article
                  key={item.id}
                  className={`user-demand-list__item${isUnread ? ' is-unread' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDemand(item.id)}
                  onKeyDown={(event) => handleDemandKeyDown(event, item.id)}
                >
                  
                  <div>
                    <strong>{item.clientName || 'Client ArchiPrice'}</strong>
                    <span>{item.projectName || 'Projet non renseigné'} · {item.createdAtLabel}</span>
                    <small>{item.messages.at(-1)?.message || 'Aucun message renseigné'}</small>
                  </div>
                  <b>{isUnread ? 'Nouvelle demande' : item.status || 'Nouveau'}</b>
                  <button
                    type="button"
                    className="user-support-list__delete"
                    title="Supprimer de ma liste"
                    aria-label={`Supprimer la demande de ${item.clientName || 'client'}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      hideDemand(item.id);
                    }}
                  >
                    <Icon name="Delete" size="sm" />
                  </button>
                </article>
                );
              })}
            </div>
          ) : (
            <Alert variant="info">Aucune demande reçue pour le moment.</Alert>
          )}
        </section>
      </section>

      {selectedDemand && (
        <div className="user-demand-modal" role="dialog" aria-modal="true" aria-label="Conversation client">
          <section className="user-demand-card">
            <header>
              <div>
                <span>{selectedDemand.projectName || 'Projet non renseigné'}</span>
                <h2>{selectedDemand.clientName || 'Client ArchiPrice'}</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setSelectedDemandId('')}>
                <Icon name="Close" size="sm" />
              </button>
            </header>

            <div className="user-support-chat__messages">
              {selectedDemand.messages.length === 0 ? (
                <p className="is-empty">
                  <span>Aucun message dans cette conversation.</span>
                </p>
              ) : (
                selectedDemand.messages.map((chatMessage) => (
                  <p
                    key={chatMessage.id}
                    className={chatMessage.senderRole === 'supplier' ? 'is-supplier' : 'is-user'}
                  >
                    <small>{chatMessage.senderName || (chatMessage.senderRole === 'supplier' ? 'Vous' : selectedDemand.clientName)}</small>
                    <span>{chatMessage.message}</span>
                  </p>
                ))
              )}
            </div>

            <footer>
              {replyDemandId === selectedDemand.sourceNotificationId ? (
                <form className="user-support-chat__reply-form" onSubmit={sendReply}>
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Écrivez votre réponse au client."
                    rows={4}
                    required
                    autoFocus
                  />
                  {replyError && (
                    <Alert variant="danger" onClose={() => setReplyError('')}>
                      {replyError}
                    </Alert>
                  )}
                  {actionMessage && (
                    <Alert variant="success" onClose={() => setActionMessage('')}>
                      {actionMessage}
                    </Alert>
                  )}
                  <div>
                    <button type="button" onClick={() => {
                      setReplyDemandId('');
                      setReplyText('');
                      setReplyError('');
                    }}>
                      Annuler
                    </button>
                    <button type="submit">Envoyer</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="user-support-chat__reply" onClick={() => setReplyDemandId(selectedDemand.sourceNotificationId)}>
                  Répondre
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
