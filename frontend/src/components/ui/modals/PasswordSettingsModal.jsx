import { useState } from 'react';
import Alert from '../Alert';
import Icon from '../Icon';
import { getApiErrorMessage } from '../../../services/api';
import './PasswordSettingsModal.css';

export default function PasswordSettingsModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setError('');
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function submitPassword(event) {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onClose();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de modifier le mot de passe.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="password-settings-modal-backdrop" role="presentation">
      <form className="password-settings-modal" role="dialog" aria-modal="true" aria-labelledby="password-settings-title" onSubmit={submitPassword}>
        <header className="password-settings-modal__header">
          <div>
            <span>Sécurité</span>
            <h2 id="password-settings-title">Modifier le mot de passe</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="password-settings-modal__body">
          {error && (
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <label>
            <span>Mot de passe actuel</span>
            <input
              type="password"
              value={form.currentPassword}
              autoComplete="current-password"
              onChange={(event) => updateField('currentPassword', event.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            <span>Nouveau mot de passe</span>
            <input
              type="password"
              value={form.newPassword}
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => updateField('newPassword', event.target.value)}
              required
            />
          </label>

          <label>
            <span>Confirmer le nouveau mot de passe</span>
            <input
              type="password"
              value={form.confirmPassword}
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              required
            />
          </label>
        </div>

        <footer className="password-settings-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </footer>
      </form>
    </div>
  );
}
