import '../../../components/demandeList.css';
import { useEffect, useMemo, useState } from 'react';
import DemandeModal from '../../../components/demandeModal';
import { Alert, Icon, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { useAdminData } from '../../../services/adminData';
import { fetchMyDemandes, hideDemande, markDemandeRead, notifyDemandesChange, replyToDemande, subscribeDemandesChange } from '../../../services/demandes';
import { isNumericOnly } from '../../../utils/formInput';
import { getStoredUserLanguage, getUserTranslations } from '../../../utils/userLanguage';

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

function normalizeDemandMessages(notification, fallbackSenderName) {
  const messages = Array.isArray(notification.messages) && notification.messages.length
    ? notification.messages
    : notification.message
      ? [{
        id: `${notification.id}-initial`,
        senderRole: 'user',
        senderName: notification.clientName || fallbackSenderName,
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

function getDemandGroupId(notification) {
  const clientKey = String(notification.clientId || notification.clientEmail || '').trim().toLowerCase();
  const supplierKey = String(notification.supplierId || notification.supplierContact || '').trim().toLowerCase();
  if (clientKey && supplierKey) return `${clientKey}|${supplierKey}`;
  return String(notification.id || '');
}

function groupDemandsByShop(notifications, fallbackSenderName) {
  const groups = new Map();

  notifications.forEach((notification) => {
    const groupId = getDemandGroupId(notification);
    const currentGroup = groups.get(groupId);
    const messages = normalizeDemandMessages(notification, fallbackSenderName);
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
      messages: normalizeDemandMessages({ ...group, message: '', messages: group.messages }, fallbackSenderName),
    }))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function getLastMessage(item) {
  return Array.isArray(item.messages) && item.messages.length > 0 ? item.messages.at(-1) : null;
}

function replaceOrPrependDemande(demandes, updatedDemande) {
  if (!updatedDemande?.id) return demandes;
  const updatedGroupId = getDemandGroupId(updatedDemande);
  let replaced = false;
  const nextDemandes = [];

  for (const demande of demandes) {
    const demandeGroupId = getDemandGroupId(demande);
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

export default function Demande() {
  const { user } = useAuth();
  const [adminData] = useAdminData();
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDemandId, setSelectedDemandId] = useState('');
  const [apiDemandes, setApiDemandes] = useState([]);
  const [isLoadingDemandes, setIsLoadingDemandes] = useState(true);
  const [language, setLanguage] = useState(getStoredUserLanguage);
  const translations = getUserTranslations(language);
  const demandText = translations.demand;

  useEffect(() => {
    const syncLanguage = () => setLanguage(getStoredUserLanguage());
    window.addEventListener('archiprice:user-profile-change', syncLanguage);
    return () => window.removeEventListener('archiprice:user-profile-change', syncLanguage);
  }, []);

  const userId = user?.id || user?._id || '';
  const userEmail = user?.email || '';
  const userName = user?.name || user?.fullName || userEmail || 'Client ArchiPrice';

  function loadDemandes({ silent = false } = {}) {
    let cancelled = false;

    if (!silent) setIsLoadingDemandes(true);

    fetchMyDemandes()
      .then((demandes) => {
        if (!cancelled) setApiDemandes(demandes);
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

  useRealtimeRefresh(() => loadDemandes({ silent: true }), ['demandes']);

  useEffect(() => subscribeDemandesChange(() => loadDemandes({ silent: true })), []);

  const demands = useMemo(() => (
    groupDemandsByShop((apiDemandes.length > 0 ? apiDemandes : adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => (
        userId
          ? notification.clientId === userId
          : notification.clientEmail === userEmail
      )), userName)
      .map((notification) => ({
        ...notification,
        createdAtLabel: formatDateTime(notification.createdAt),
      }))
  ), [adminData.supplierClientNotifications, apiDemandes, userEmail, userId, userName]);

  async function hideDemand(itemId) {
    const demandeId = demands.find((item) => item.id === itemId)?.sourceNotificationId;
    if (!demandeId) return;

    const previousDemandes = apiDemandes;
    setApiDemandes((currentDemandes) => (
      currentDemandes.filter((demande) => getDemandGroupId(demande) !== itemId)
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
      const nextGroupId = getDemandGroupId(updatedDemande);
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
  const unreadDemandCount = demands.filter((item) => Number(item.unreadForUser) > 0).length;

  function markDemandAsRead(item) {
    setApiDemandes((currentDemandes) => currentDemandes.map((demande) => (
      getDemandGroupId(demande) === item.id ? { ...demande, unreadForUser: 0 } : demande
    )));
    markDemandeRead(item.sourceNotificationId).catch(() => {});
  }

  function openDemand(itemId) {
    const demand = demands.find((item) => item.id === itemId);
    if (demand) {
      markDemandAsRead(demand);
      markDemandeRead(demand.sourceNotificationId).catch(() => {});
      setReplyError('');
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
                {demandText.badgeNewMessages(unreadDemandCount)}
              </strong>
            )}
          </div>
        </header>

        <section className="user-support-card">
          <h2>{demandText.title}</h2>
          {actionMessage && (
            <Alert variant="success" className="user-demand-action-alert" autoCloseMs={4000} onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          )}
          {isLoadingDemandes ? (
            <Loader label={demandText.loading} />
          ) : demands.length ? (
            <div className="user-support-list user-demand-list">
              {demands.map((item) => {
                const isUnread = Number(item.unreadForUser) > 0;
                const lastMessage = getLastMessage(item);
                const isRead = Boolean(lastMessage?.readByUserAt);

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
                    <strong>{item.supplierName || 'Boutique'}</strong>
                    <span>{item.projectName || demandText.noProject} · {item.createdAtLabel}</span>
                    <small>{item.messages.at(-1)?.message || demandText.noMessage}</small>
                  </div>
                  <span className={`user-demand-list__status${isUnread ? ' is-unread-badge' : ''}${isRead ? ' is-read-badge' : ''}`}>
                    {isUnread ? demandText.newMessage : (isRead ? demandText.readLabel : (demandText.sentLabel || 'Envoyé'))}
                  </span>
                  <button
                    type="button"
                    className="user-support-list__delete"
                    title={demandText.deleteTitle}
                    aria-label={`Supprimer la demande à ${item.supplierName || 'boutique'}`}
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
          currentRole="user"
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
