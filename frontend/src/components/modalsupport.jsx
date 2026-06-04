import './modalsupport.css';
import { useState } from 'react';
import { Button, Icon } from './ui';

export default function ModalSupport({
  title = 'Laisser un commentaire',
  placeholder = 'Écrivez votre feedback...',
  onCancel,
  onSubmit,
}) {
  const [comment, setComment] = useState('');

  function submitComment(event) {
    event.preventDefault();
    const value = comment.trim();
    if (!value) return;

    onSubmit(value);
    setComment('');
  }

  return (
    <div className="modal-support-backdrop" role="presentation">
      <form className="modal-support" role="dialog" aria-modal="true" aria-labelledby="modal-support-title" onSubmit={submitComment}>
        <header className="modal-support__header">
          <div>
            <span>Feedback</span>
            <h2 id="modal-support-title">{title}</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onCancel}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <label className="modal-support__field">
          <span>Message</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={placeholder}
            rows={7}
            required
            autoFocus
          />
        </label>

        <footer className="modal-support__footer">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" icon={<Icon name="Check" size="sm" />}>
            Envoyer
          </Button>
        </footer>
      </form>
    </div>
  );
}
