import '../../../components/demandeList.css';
import { useEffect, useMemo, useState } from 'react';
import DemandeModal from '../../../components/demandeModal';
import { Alert, Icon, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { useAdminData } from '../../../services/adminData';
import { fetchMyDemandes, hideDemande, markDemandeRead, notifyDemandesChange, replyToDemande, subscribeDemandesChange } from '../../../services/demandes';
import { fetchSupplierWorkspace } from '../../../services/supplier';
import { isNumericOnly } from '../../../utils/formInput';
import { getSupplierTranslations } from '../../../utils/supplierLanguage';

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
  const clientKey = String(notification.clientId || notification.clientEmail || '').trim().toLowerCase();
  const supplierKey = String(notification.supplierId || notification.supplierContact || '').trim().toLowerCase();
  if (clientKey && supplierKey) return `${clientKey}|${supplierKey}`;
  return String(notification.id || '');
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

function getDemandBadge(item, demandText) {
  const lastMessage = getLastMessage(item);
  if (!lastMessage) {
    return { text: demandText.sentLabel || 'Envoyé', isUnread: false };
  }

  if (lastMessage.senderRole === 'user' && Number(item.unreadForSupplier) > 0) {
    return { text: demandText.newMessage, isUnread: true };
  }

  if (lastMessage.senderRole === 'supplier') {
    return { text: lastMessage.readByUserAt ? 'Lu' : 'Envoyé', isUnread: false, isRead: Boolean(lastMessage.readByUserAt) };
  }

  return { text: demandText.sentLabel || 'Envoyé', isUnread: false };
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
  const [adminData] = useAdminData();
  const translations = getSupplierTranslations(adminData);
  const demandText = translations.demand;
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDemandId, setSelectedDemandId] = useState('');
  const [apiDemandes, setApiDemandes] = useState([]);
  const [isLoadingDemandes, setIsLoadingDemandes] = useState(true);

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

  const demands = useMemo(() => (
    groupDemandsByClient((apiDemandes.length > 0 ? apiDemandes : adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => isDemandForSupplier(notification, user, supplierProfile)))
      .map((notification) => ({
        ...notification,
        createdAtLabel: formatDateTime(notification.createdAt),
      }))
  ), [adminData.supplierClientNotifications, apiDemandes, supplierProfile, user]);

  async function hideDemand(itemId) {
    const demandeId = demands.find((item) => item.id === itemId)?.sourceNotificationId;
    if (!demandeId) return;

    const previousDemandes = apiDemandes;
    setApiDemandes((currentDemandes) => (
      currentDemandes.filter((demande) => getSupplierDemandGroupId(demande) !== itemId)
    ));
    if (selectedDemandId === itemId) setSelectedDemandId('');

    try {
      await hideDemande(demandeId);
      setActionMessage(demandText.conversationHidden);
    } catch {
      setApiDemandes(previousDemandes);
      setActionMessage(demandText.conversationHideError || 'La conversation n’a pas pu être masquée.');
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    const comment = replyText.trim();
    const targetDemandId = selectedDemand?.sourceNotificationId;
    if (!targetDemandId || !comment) return;
    if (isNumericOnly(comment)) {
      setReplyError('Le message doit contenir du texte.');
      setActionMessage('');
      return;
    }

    try {
      const updatedDemande = await replyToDemande(targetDemandId, comment);
      const nextGroupId = getSupplierDemandGroupId(updatedDemande);
      setApiDemandes((currentDemandes) => replaceOrPrependDemande(currentDemandes, updatedDemande));
      setSelectedDemandId(nextGroupId || updatedDemande.id);
      setReplyText('');
      setReplyError('');
      setActionMessage(demandText.messageSent);
    } catch {
      setReplyError(demandText.messageSendError || 'L’envoi a échoué. Réessayez.');
      setActionMessage('');
    }
  }

  const selectedDemand = demands.find((item) => item.id === selectedDemandId);
  const unreadDemandCount = demands.filter((item) => Number(item.unreadForSupplier) > 0).length;

  function markDemandAsRead(item) {
    setApiDemandes((currentDemandes) => currentDemandes.map((demande) => (
      getSupplierDemandGroupId(demande) === item.id ? { ...demande, unreadForSupplier: 0 } : demande
    )));
    markDemandeRead(item.sourceNotificationId).catch(() => {});
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
                const badge = getDemandBadge(item, demandText);

                return (
                <article
                  key={item.id}
                  className={`user-demand-list__item${badge.isUnread ? ' is-unread' : ''}`}
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
                  <span className={`user-demand-list__status${badge.isUnread ? ' is-unread-badge' : ''}${badge.isSent ? ' is-sent-badge' : ''}${badge.isRead ? ' is-read-badge' : ''}`}>
                    {badge.text}
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
