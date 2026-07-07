import { useState } from 'react';
import Alert from '../Alert';
import Icon from '../Icon';
import { getApiErrorMessage } from '../../../services/api';
import './PasswordSettingsModal.css';

export default function PasswordSettingsModal({ labels, onClose, onSubmit }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setError('');
    setSuccessMessage('');
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function submitPassword(event) {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setError(labels.passwordModal.mismatch);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccessMessage(labels.passwordModal.saved);
      window.setTimeout(onClose, 500);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, labels.passwordModal.saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="password-settings-modal-backdrop" role="presentation">
      <form className="password-settings-modal" role="dialog" aria-modal="true" aria-labelledby="password-settings-title" onSubmit={submitPassword}>
        <header className="password-settings-modal__header">
          <div>
            <span>{labels.passwordModal.eyebrow}</span>
            <h2 id="password-settings-title">{labels.passwordModal.title}</h2>
          </div>
          <button type="button" aria-label={labels.close} onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="password-settings-modal__body">
          {error && (
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}

          <label>
            <span>{labels.passwordModal.currentPassword}</span>
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
            <span>{labels.passwordModal.newPassword}</span>
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
            <span>{labels.passwordModal.confirmPassword}</span>
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
          <button type="button" onClick={onClose}>{labels.cancel}</button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? labels.saving : labels.save}
          </button>
        </footer>
      </form>
    </div>
  );
}
