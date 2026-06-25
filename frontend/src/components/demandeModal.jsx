import { useEffect, useRef } from 'react';
import Avatar from './Avatar';
import { Alert, Icon } from './ui';
import { getAvatarColor } from '../utils/userDisplay';
import './demandeModal.css';

function formatMessageDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function DemandeModal({
  demand,
  currentRole,
  currentUser,
  replyText,
  replyError,
  actionMessage,
  placeholder = 'Écrivez votre message…',
  labels = {},
  onReplyTextChange,
  onDismissReplyError,
  onDismissActionMessage,
  onSubmit,
  onClose,
}) {
  const messagesEndRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const isSupplier = currentRole === 'supplier';
  const counterpartName = isSupplier
    ? demand.clientName || 'Client ArchiPrice'
    : demand.supplierName || 'Boutique';
  const counterpartAvatar = isSupplier ? '' : demand.supplierLogo;
  const currentAvatar = isSupplier ? demand.supplierLogo : currentUser?.avatar;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [demand.messages]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className="user-demand-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demande-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="demande-modal__card">
        <header className="demande-modal__header">
          <Avatar
            src={counterpartAvatar}
            name={counterpartName}
            size="sm"
            color="#727bd8"
            className="demande-modal__header-avatar"
          />
          <div className="demande-modal__identity">
            <span>{demand.projectName || labels.noProject || 'Projet non renseigné'}</span>
            <h2 id="demande-modal-title">{counterpartName}</h2>
          </div>
          <button type="button" className="demande-modal__close" aria-label={labels.close || 'Fermer'} onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="demande-modal__messages">
          {demand.messages.length === 0 ? (
            <div className="demande-modal__empty">{labels.noConversationMessage || 'Aucun message dans cette conversation.'}</div>
          ) : demand.messages.map((message) => {
            const isCurrentUser = message.senderRole === currentRole;
            const senderName = isCurrentUser ? labels.you || 'Vous' : message.senderName || counterpartName;

            return (
              <article
                key={message.id}
                className={`demande-modal__message ${isCurrentUser ? 'is-current-user' : 'is-counterpart'}`}
              >
                <Avatar
                  src={isCurrentUser ? currentAvatar : counterpartAvatar}
                  name={message.senderName || senderName}
                  size="sm"
                  color={isCurrentUser ? getAvatarColor(currentUser) : '#727bd8'}
                  className="demande-modal__message-avatar"
                />
                <div className="demande-modal__message-content">
                  <div className="demande-modal__bubble">{message.message}</div>
                  <small>
                    {senderName}
                    {message.createdAt ? ` · ${formatMessageDate(message.createdAt)}` : ''}
                  </small>
                </div>
              </article>
            );
          })}
          <span ref={messagesEndRef} aria-hidden="true" />
        </div>

        <footer className="demande-modal__composer">
          <form className="user-support-chat__reply-form" onSubmit={onSubmit}>
            <div className="user-support-chat__input-row">
              <textarea
                value={replyText}
                onChange={(event) => onReplyTextChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={placeholder}
                aria-label={labels.message || 'Votre message'}
                rows={1}
                required
              />
              <button type="submit" aria-label={labels.send || 'Envoyer le message'} disabled={!replyText.trim()}>
                <Icon name="Send" size="md" />
              </button>
            </div>
            {replyError && <Alert variant="danger" onClose={onDismissReplyError}>{replyError}</Alert>}
            {actionMessage && <Alert variant="success" onClose={onDismissActionMessage}>{actionMessage}</Alert>}
          </form>
        </footer>
      </section>
    </div>
  );
}
