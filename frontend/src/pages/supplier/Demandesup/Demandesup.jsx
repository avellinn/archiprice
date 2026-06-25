import '../../../components/demandeList.css';
import { useEffect, useMemo, useState } from 'react';
import DemandeModal from '../../../components/demandeModal';
import { Alert, Icon, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { useAdminData } from '../../../services/adminData';
import { fetchMyDemandes, markDemandeRead, notifyDemandesChange, replyToDemande, subscribeDemandesChange } from '../../../services/demandes';
import { fetchSupplierWorkspace } from '../../../services/supplier';
import { isNumericOnly } from '../../../utils/formInput';
import { getSupplierTranslations } from '../../../utils/supplierLanguage';

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

  return messages
    .filter((message) => {
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
    })
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function getSupplierDemandGroupId(notification) {
  return [
    notification.clientId,
    notification.clientEmail,
    notification.clientName,
    notification.projectId,
    notification.productId,
    notification.supplierId,
    notification.supplierName,
    notification.supplierContact,
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

  return [...groups.values()]
    .map((group) => ({
      ...group,
      messages: normalizeDemandMessages({ ...group, message: '', messages: group.messages }),
    }))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
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
  if (Number.isFinite(Number(item.unreadForSupplier))) return Number(item.unreadForSupplier) > 0;
  return getDemandReadKeys(item, notifications, 'user').some((key) => !readKeys.includes(key));
}

function replaceOrPrependDemande(demandes, updatedDemande) {
  if (!updatedDemande?.id) return demandes;
  const updatedGroupId = getSupplierDemandGroupId(updatedDemande);
  let replaced = false;
  const nextDemandes = [];

  for (const demande of demandes) {
    const demandeGroupId = getSupplierDemandGroupId(demande);
    if (!replaced && (demande.id === updatedDemande.id || demandeGroupId === updatedGroupId)) {
      nextDemandes.push(updatedDemande);
      replaced = true;
      continue;
    }
    if (demande.id === updatedDemande.id || demandeGroupId === updatedGroupId) {
      continue;
    }
    nextDemandes.push(demande);
  }

  return replaced ? nextDemandes : [updatedDemande, ...demandes];
}

export default function Demandesup() {
  const { user } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const translations = getSupplierTranslations(adminData);
  const demandText = translations.demand;
  const [supplierProfile, setSupplierProfile] = useState(null);
  const hiddenDemandItemsKey = getHiddenDemandItemsKey(user, supplierProfile);
  const [hiddenDemandIds, setHiddenDemandIds] = useState(() => readHiddenDemandItems(hiddenDemandItemsKey));
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDemandId, setSelectedDemandId] = useState('');
  const [apiDemandes, setApiDemandes] = useState([]);
  const [isLoadingDemandes, setIsLoadingDemandes] = useState(true);
  const [readNotificationKeys, setReadNotificationKeys] = useState(readDismissedNotificationKeys);

  function loadDemandes({ silent = false } = {}) {
    let cancelled = false;

    if (!silent) setIsLoadingDemandes(true);

    Promise.allSettled([fetchSupplierWorkspace(), fetchMyDemandes()])
      .then(([workspaceResult, demandesResult]) => {
        if (cancelled) return;
        if (workspaceResult.status === 'fulfilled') setSupplierProfile(workspaceResult.value?.supplier || null);
        if (demandesResult.status === 'fulfilled') setApiDemandes(demandesResult.value);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && !silent) setIsLoadingDemandes(false);
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    let cancelLoad = () => {};
    const timer = window.setTimeout(() => {
      cancelLoad = loadDemandes();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancelLoad();
    };
  }, []);

  useRealtimeRefresh(() => loadDemandes({ silent: true }), ['demandes', 'suppliers']);

  useEffect(() => subscribeDemandesChange(() => loadDemandes({ silent: true })), []);

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
    groupDemandsByClient((apiDemandes.length > 0 ? apiDemandes : adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => isDemandForSupplier(notification, user, supplierProfile))
      .filter((notification) => !hiddenDemandIds.includes(getSupplierDemandGroupId(notification))))
      .map((notification) => ({
        ...notification,
        createdAtLabel: formatDateTime(notification.createdAt),
      }))
  ), [adminData.supplierClientNotifications, apiDemandes, hiddenDemandIds, supplierProfile, user]);

  function hideDemand(itemId) {
    const nextHiddenIds = Array.from(new Set([...hiddenDemandIds, String(itemId)]));
    setHiddenDemandIds(nextHiddenIds);
    writeHiddenDemandItems(hiddenDemandItemsKey, nextHiddenIds);
    if (selectedDemandId === itemId) setSelectedDemandId('');
    setActionMessage(demandText.conversationHidden);
  }

  function sendReply(event) {
    event.preventDefault();
    const comment = replyText.trim();
    const targetDemandId = selectedDemand?.sourceNotificationId;
    if (!targetDemandId || !comment) return;
    if (isNumericOnly(comment)) {
      setReplyError('Le message doit contenir du texte.');
      setActionMessage('');
      return;
    }

    const supplierName = supplierProfile?.companyName
      || supplierProfile?.name
      || user?.companyName
      || user?.shopName
      || user?.name
      || 'Boutique';

    replyToDemande(targetDemandId, comment)
      .then((updatedDemande) => {
        setApiDemandes((currentDemandes) => replaceOrPrependDemande(currentDemandes, updatedDemande));
        setReplyText('');
        setReplyError('');
        setActionMessage(demandText.messageSent);
      })
      .catch(() => {
        const now = new Date().toISOString();
        updateAdminData((currentData) => ({
          ...currentData,
          supplierClientNotifications: (currentData.supplierClientNotifications || []).map((notification) => {
            if (notification.id !== targetDemandId) return notification;

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
        notifyDemandesChange({ action: 'message-created-local', demandeId: targetDemandId });
        setReplyText('');
        setReplyError('');
        setActionMessage(demandText.messageSent);
      });
  }

  const demandNotifications = apiDemandes.length > 0 ? apiDemandes : adminData.supplierClientNotifications || [];
  const selectedDemand = demands.find((item) => item.id === selectedDemandId);
  const unreadDemandCount = demands.filter((item) => (
    hasUnreadClientMessage(item, readNotificationKeys, demandNotifications)
  )).length;

  function markDemandAsRead(item) {
    const keys = getDemandReadKeys(item, demandNotifications, 'user');
    const notificationIds = new Set((item.notificationIds || [item.sourceNotificationId]).filter(Boolean).map(String));
    setApiDemandes((currentDemandes) => currentDemandes.map((demande) => (
      notificationIds.has(String(demande.id || '')) ? { ...demande, unreadForSupplier: 0 } : demande
    )));

    if (keys.length > 0) {
      const nextKeys = [...new Set([...readNotificationKeys, ...keys])];
      setReadNotificationKeys(nextKeys);
      writeDismissedNotificationKeys(nextKeys);
    }
  }

  function openDemand(itemId) {
    const demand = demands.find((item) => item.id === itemId);
    if (demand) {
      markDemandAsRead(demand);
      markDemandeRead(demand.sourceNotificationId).catch(() => {});
    }
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
            <span>{demandText.eyebrow}</span>
            {unreadDemandCount > 0 && (
              <strong className="user-demand-notification-badge">
                {demandText.badgeNewRequests(unreadDemandCount)}
              </strong>
            )}
          </div>
        </header>

        <section className="user-support-card">
          <h2>{demandText.title}</h2>
          {actionMessage && (
            <Alert variant="success" className="user-demand-action-alert" onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          )}
          {isLoadingDemandes ? (
            <Loader label={demandText.loading} />
          ) : demands.length ? (
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
                    <span>{item.projectName || demandText.noProject} · {item.createdAtLabel}</span>
                    <small>{item.messages.at(-1)?.message || demandText.noMessage}</small>
                  </div>
                  <span className={`user-demand-list__status${isUnread ? ' is-unread-badge' : ''}`}>
                    {isUnread ? demandText.newMessage : (item.status || demandText.readLabel)}
                  </span>
                  <button
                    type="button"
                    className="user-support-list__delete"
                    title={demandText.deleteTitle}
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
            <Alert variant="info" layout="inline">{demandText.empty}</Alert>
          )}
        </section>
      </section>

      {selectedDemand && (
        <DemandeModal
          demand={selectedDemand}
          currentRole="supplier"
          currentUser={user}
          replyText={replyText}
          replyError={replyError}
          actionMessage={actionMessage}
          placeholder={demandText.placeholder}
          labels={{ ...demandText, ...translations.common }}
          onReplyTextChange={setReplyText}
          onDismissReplyError={() => setReplyError('')}
          onDismissActionMessage={() => setActionMessage('')}
          onSubmit={sendReply}
          onClose={() => {
            setSelectedDemandId('');
            setReplyText('');
            setReplyError('');
          }}
        />
      )}
    </main>
  );
}
