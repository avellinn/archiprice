import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [apiError, setApiError] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    setApiError(null);
    try {
      await login(data);
      navigate(from, { replace: true });
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
          {errors.email && <span className="auth-field-error">{errors.email.message}</span>}
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

        {apiError && <p className="auth-error">{apiError}</p>}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthLayout>
  );
}
