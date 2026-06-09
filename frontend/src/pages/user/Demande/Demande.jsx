import './Demande.css';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { useAdminData } from '../../../services/adminData';
import { isNumericOnly } from '../../../utils/formInput';

const HIDDEN_DEMAND_ITEMS_KEY = 'archiprice:user-demand-hidden-items';

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

function getHiddenDemandItemsKey(userId, userEmail) {
  return `${HIDDEN_DEMAND_ITEMS_KEY}:${userId || userEmail || 'anonymous'}`;
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

function getDemandGroupId(notification) {
  return [
    notification.supplierId,
    notification.supplierName,
    notification.supplierContact,
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean).join('|')
    || String(notification.id || '');
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

  return [...groups.values()].map((group) => ({
    ...group,
    messages: normalizeDemandMessages({ ...group, message: '', messages: group.messages }, fallbackSenderName),
  }));
}

export default function Demande() {
  const { user } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const [hiddenDemandIds, setHiddenDemandIds] = useState([]);
  const [replyDemandId, setReplyDemandId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDemandId, setSelectedDemandId] = useState('');

  const userEmail = user?.email || '';
  const userId = user?.id || user?._id || '';
  const userName = user?.name || user?.fullName || userEmail || 'Client ArchiPrice';
  const hiddenDemandItemsKey = getHiddenDemandItemsKey(userId, userEmail);

  useEffect(() => {
    setHiddenDemandIds(readHiddenDemandItems(hiddenDemandItemsKey));
  }, [hiddenDemandItemsKey]);

  const demands = useMemo(() => (
    groupDemandsByShop((adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => !hiddenDemandIds.includes(getDemandGroupId(notification)))
      .filter((notification) => (
        notification.clientId === userId
        || notification.clientEmail === userEmail
      )), userName)
      .map((notification) => ({
        ...notification,
        createdAtLabel: formatDateTime(notification.createdAt),
      }))
  ), [adminData.supplierClientNotifications, hiddenDemandIds, userEmail, userId, userName]);

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
    updateAdminData((currentData) => ({
      ...currentData,
      supplierClientNotifications: (currentData.supplierClientNotifications || []).map((notification) => {
        if (notification.id !== replyDemandId) return notification;

        return {
          ...notification,
          status: 'Répondu',
          messages: normalizeDemandMessages(notification, userName).concat([
            {
              id: `message-${Date.now()}`,
              senderRole: 'user',
              senderName: userName,
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

  const selectedDemand = demands.find((item) => item.id === selectedDemandId);

  function openDemand(itemId) {
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
            <span>Conversations boutique</span>
            
          </div>
        </header>

        <section className="user-support-card">
          <h2>Mes demandes boutique</h2>
          {actionMessage && (
            <Alert variant="success" className="user-demand-action-alert" onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          )}
          {demands.length ? (
            <div className="user-support-list user-demand-list">
              {demands.map((item) => (
                <article
                  key={item.id}
                  className="user-demand-list__item"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDemand(item.id)}
                  onKeyDown={(event) => handleDemandKeyDown(event, item.id)}
                >
                  
                  <div>
                    <strong>{item.supplierName || 'Boutique'}</strong>
                    <span>{item.projectName || 'Projet non renseigné'} · {item.createdAtLabel}</span>
                    <small>{item.messages.at(-1)?.message || 'Aucun message renseigné'}</small>
                  </div>
                  <b>{item.status || 'Nouveau'}</b>
                  <button
                    type="button"
                    className="user-support-list__delete"
                    title="Supprimer de ma liste"
                    aria-label={`Supprimer la demande à ${item.supplierName || 'boutique'}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      hideDemand(item.id);
                    }}
                  >
                    <Icon name="Delete" size="sm" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Alert variant="info">Cliquez sur une boutique depuis "Où acheter" pour démarrer une demande.</Alert>
          )}
        </section>
      </section>

      {selectedDemand && (
        <div className="user-demand-modal" role="dialog" aria-modal="true" aria-label="Conversation boutique">
          <section className="user-demand-card">
            <header>
              <div>
                <span>{selectedDemand.projectName || 'Projet non renseigné'}</span>
                <h2>{selectedDemand.supplierName || 'Boutique'}</h2>
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
                    className={chatMessage.senderRole === 'user' ? 'is-user' : 'is-supplier'}
                  >
                    <small>{chatMessage.senderName || (chatMessage.senderRole === 'user' ? 'Vous' : selectedDemand.supplierName)}</small>
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
                    placeholder="Écrivez votre message."
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
