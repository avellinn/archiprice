import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Header from '../components/Header';
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
    <>
      <Header />
      <main className="page page-narrow">
        <h1>Inscription</h1>
        <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label>
            Nom (optionnel)
            <input type="text" autoComplete="name" {...register('name')} />
          </label>

          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Email requis' })}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: { value: 6, message: 'Minimum 6 caractères' },
              })}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </label>

          {apiError && <p className="error">{apiError}</p>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Inscription…' : "S'inscrire"}
          </button>
        </form>

        <p>
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </main>
    </>
  );
}
