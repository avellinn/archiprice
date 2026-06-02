import './Login.css';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import '../../../styles/authForm.css';
import AuthLayout from '../../../components/AuthLayout';
import PasswordInput from '../../../components/PasswordInput';
import { Alert, Text } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [apiError, setApiError] = useState(null);

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

  return (
    <AuthLayout
      title="Se connecter"
      subtitle="Veuillez vous identifier"
      footer={
        <>
          Vous n&apos;avez pas de compte ?{' '}
          <Link to="/register" className="auth-link">
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
            <Link to="/login" className="auth-link" onClick={(e) => e.preventDefault()}>
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
