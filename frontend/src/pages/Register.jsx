import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    setApiError(null);
    try {
      await registerUser(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Inscription impossible'));
    }
  };

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Veuillez remplir le formulaire"
      footer={
        <>
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="auth-link">
            Se connecter
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-email">
            Adresse email
          </label>
          <input
            id="register-email"
            type="email"
            className="auth-input"
            placeholder="Entrez votre Adresse email"
            autoComplete="email"
            {...register('email', { required: 'Email requis' })}
          />
          {errors.email && <span className="auth-field-error">{errors.email.message}</span>}
        </div>

        <PasswordInput
          id="register-password"
          placeholder="Entrez votre mot de passe"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Mot de passe requis',
            minLength: { value: 6, message: 'Minimum 6 caractères' },
          })}
        />

        {apiError && <p className="auth-error">{apiError}</p>}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Inscription…' : 'Créer un compte'}
        </button>
      </form>
    </AuthLayout>
  );
}
