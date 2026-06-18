import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import '../../../styles/authForm.css';
import AuthLayout from '../../../components/AuthLayout';
import PasswordInput from '../../../components/PasswordInput';
import { Alert, Text } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { requestPasswordReset } from '../../../services/auth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [apiError, setApiError] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetPreviewUrl, setResetPreviewUrl] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const from = location.state?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    setApiError(null);
    try {
      const loggedUser = await login(data);
      const isAdmin = loggedUser?.role === 'admin';
      const isSupplier = loggedUser?.role === 'supplier';
      const fallbackPath = loggedUser?.redirectTo || (isAdmin ? '/admin/dashboard' : isSupplier ? '/supplier/dashboard' : '/dashboard');
      const requestedPath = from || fallbackPath;
      const destination = (
        (isAdmin && requestedPath.startsWith('/admin'))
        || (isSupplier && requestedPath.startsWith('/supplier'))
        || (!isAdmin && !isSupplier && !requestedPath.startsWith('/admin') && !requestedPath.startsWith('/supplier'))
      )
        ? requestedPath
        : fallbackPath;

      navigate(destination, { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Connexion impossible'));
    }
  };

  async function sendResetRequest(event) {
    event.preventDefault();
    const email = resetEmail.trim();
    if (!email) {
      setResetError('Email requis');
      setResetMessage('');
      return;
    }

    setIsResetSubmitting(true);
    setResetError('');
    setResetMessage('');
    setResetPreviewUrl('');

    try {
      const response = await requestPasswordReset(email);
      setResetMessage(response.message || 'Si ce compte existe, un email de réinitialisation a été envoyé.');
      if (response.resetUrl) {
        setResetPreviewUrl(response.resetUrl);
      }
    } catch (err) {
      setResetError(getApiErrorMessage(err, "Impossible d'envoyer le lien de réinitialisation"));
    } finally {
      setIsResetSubmitting(false);
    }
  }

  if (showForgotPassword) {
    return (
      <AuthLayout
        title="Mot de passe oublié"
        subtitle="Recevoir un lien de réinitialisation"
        footer={
          <>
            Vous avez retrouvé votre mot de passe ?{' '}
            <Link
              to="/login"
              className="auth-link"
              onClick={(event) => {
                event.preventDefault();
                setShowForgotPassword(false);
                setResetEmail('');
                setResetError('');
                setResetMessage('');
                setResetPreviewUrl('');
              }}
            >
              Se connecter
            </Link>
          </>
        }
      >
        <form className="auth-form" onSubmit={sendResetRequest} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="forgot-password-email">
              Entrez votre adresse email
            </label>
            <input
              id="forgot-password-email"
              type="email"
              className="auth-input"
              placeholder="exemple@email.com"
              autoComplete="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              autoFocus
            />
          </div>
          {resetError && (
            <Alert variant="danger" onClose={() => setResetError('')}>
              {resetError}
            </Alert>
          )}
          {resetMessage && (
            <Alert variant="success" onClose={() => setResetMessage('')}>
              <span>{resetMessage}</span>
              {resetPreviewUrl && (
                <a className="auth-reset-preview-link" href={resetPreviewUrl}>
                  Ouvrir le lien de réinitialisation
                </a>
              )}
            </Alert>
          )}
          <button type="submit" className="auth-submit" disabled={isResetSubmitting}>
            {isResetSubmitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Se connecter"
      subtitle="Veuillez vous identifier"
      footer={
        <>
          Vous n&apos;avez pas de compte ?{' '}
          <Link to="/" className="auth-link">
            Créer un compte
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            Adresse email
          </label>
          <input
            id="login-email"
            type="email"
            className="auth-input"
            placeholder="Entrez votre adress-email "
            autoComplete="email"
            {...register('email', { required: 'Email requis' })}
          />
          {errors.email && (
            <Text as="span" size="sm" className="auth-field-error">
              {errors.email.message}
            </Text>
          )}
        </div>

        <PasswordInput
          id="login-password"
          placeholder="Entrez votre mot de passe"
          autoComplete="current-password"
          error={errors.password?.message}
          forgotLink={
            <Link
              to="/login"
              className="auth-link"
              onClick={(event) => {
                event.preventDefault();
                setShowForgotPassword((currentValue) => !currentValue);
                setResetEmail('');
                setResetError('');
                setResetMessage('');
                setResetPreviewUrl('');
              }}
            >
              Mot de passe oublié ?
            </Link>
          }
          {...register('password', { required: 'Mot de passe requis' })}
        />

        {apiError && (
          <Alert variant="danger" title="Connexion impossible" onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthLayout>
  );
}
