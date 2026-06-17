import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../../../styles/authForm.css';
import AuthLayout from '../../../components/AuthLayout';
import PasswordInput from '../../../components/PasswordInput';
import { Alert } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { resetPassword } from '../../../services/auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReset(event) {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!token) {
      setError('Lien de réinitialisation invalide.');
      return;
    }

    if (password.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({ token, password });
      setSuccessMessage(response.message || 'Mot de passe réinitialisé.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1600);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de réinitialiser le mot de passe.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Réinitialiser"
      subtitle="Choisissez un nouveau mot de passe"
      footer={(
        <>
          Retour à la connexion ?{' '}
          <Link to="/login" className="auth-link">
            Se connecter
          </Link>
        </>
      )}
    >
      <form className="auth-form" onSubmit={submitReset} noValidate>
        <PasswordInput
          id="reset-password"
          label="Nouveau mot de passe"
          placeholder="Nouveau mot de passe"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <PasswordInput
          id="reset-password-confirm"
          label="Confirmation du mot de passe"
          placeholder="Confirmez le mot de passe"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

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

        <button type="submit" className="auth-submit" disabled={isSubmitting || !token}>
          {isSubmitting ? 'Réinitialisation...' : 'Réinitialiser'}
        </button>
      </form>
    </AuthLayout>
  );
}
