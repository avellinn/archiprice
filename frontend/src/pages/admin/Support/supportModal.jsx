import './supportModal.css';
import { useState } from 'react';
import { Alert, Button, Icon } from '../../../components/ui';
import { isNumericOnly } from '../../../utils/formInput';

export default function SupportModal({
  item,
  replyDraft,
  onReplyChange,
  onClose,
  onUpdate,
  canReply = true,
  labels = {},
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  if (!item) return null;

  function sendReply() {
    if (!String(replyDraft || '').trim()) {
      setReplyError('Réponse requise.');
      return;
    }
    if (isNumericOnly(replyDraft)) {
      setReplyError('La réponse doit contenir du texte.');
      return;
    }
    onUpdate({ reply: replyDraft, status: 'En cours' });
    setReplyError('');
    setActionMessage('Réponse envoyée.');
    setIsReplying(false);
  }

  return (
    <div className="support-modal-backdrop" role="presentation">
      <section className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-modal-title">
        <header>
          <h2 id="support-modal-title">Détail </h2>
          <button type="button" aria-label={labels.close || 'Fermer'} onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="support-modal__card">
          <h3>Informations support</h3>
          <div className="support-modal__detail-grid">
            
            
            <article>
              <span>Utilisateur</span>
              <strong>{item.user || '-'}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{item.email || '-'}</strong>
            </article>
            <article>
              <span>Sujet</span>
              <strong>{item.subject || '-'}</strong>
            </article>
            <article>
              <span>Date</span>
              <strong>{item.date || '-'}</strong>
            </article>
          </div>
        </section>

        <section className="support-modal__card">
          <h3>Description</h3>
          <p>{item.description || '-'}</p>
        </section>

        {Array.isArray(item.messages) && item.messages.length > 0 && (
          <section className="support-modal__card">
            <h3>Conversation</h3>
            {item.messages.map((message) => (
              <p key={message._id || message.id || `${message.createdAt}-${message.message}`}>
                <strong>{message.senderName || message.senderRole} :</strong> {message.message}
              </p>
            ))}
          </section>
        )}

        {item.reply && !isReplying && (
          <section className="support-modal__card">
            <h3>Réponse </h3>
            <p>{item.reply}</p>
          </section>
        )}

        {actionMessage && (
          <section className="support-modal__card">
            <Alert variant="success" onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          </section>
        )}

        {isReplying && (
          <section className="support-modal__card">
            <label className="support-modal__reply">
              <span>Réponse</span>
              <textarea
                placeholder="Votre réponse..."
                value={replyDraft}
                onChange={(event) => onReplyChange(event.target.value)}
                autoFocus
              />
            </label>
            {replyError && <Alert variant="danger">{replyError}</Alert>}
          </section>
        )}

        <footer>
          {!canReply ? (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {labels.close || 'Fermer'}
            </Button>
          ) : isReplying ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReplying(false)}>
                {labels.cancel || 'Annuler'}
              </Button>
              <Button type="button" size="sm" onClick={sendReply}>
                {labels.send || 'Envoyer'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {labels.cancel || 'Annuler'}
              </Button>
              <Button type="button" size="sm" onClick={() => setIsReplying(true)}>
                {labels.reply || 'Répondre'}
              </Button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
