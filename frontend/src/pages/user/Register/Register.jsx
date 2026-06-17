import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import './Register.css';
import { Alert } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';

const CATEGORY_OTHER_VALUE = '__other_category__';
const ACTIVITY_SECTORS = [
  'Architecture',
  'Agence',
  'BTP / Construction',
  'Décoration',
  'Immobilier',
  'Ingénierie',
  'Maître d’ouvrage',
  'Menuiserie',
  'Peinture',
  'Plomberie',
  'Électricité',
];

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register: registerUser } = useAuth();
  const [apiError, setApiError] = useState(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const accountType = searchParams.get('accountType') === 'supplier' ? 'supplier' : 'user';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { category: ACTIVITY_SECTORS[0] } });
  const [selectedCategory, setSelectedCategory] = useState(ACTIVITY_SECTORS[0]);
  const isCustomCategory = selectedCategory === CATEGORY_OTHER_VALUE;

  const onSubmit = async (data) => {
    setApiError(null);
    const category = isCustomCategory ? data.customCategory?.trim() : data.category;

    try {
      await registerUser({
        ...data,
        name: data.name,
        category,
        accountType,
        companyName: accountType === 'supplier' ? data.companyName : undefined,
        city: accountType === 'supplier' ? data.city : undefined,
        neighborhood: accountType === 'supplier' ? data.neighborhood : undefined,
        categories: accountType === 'supplier' ? [category] : undefined,
      });
      navigate(accountType === 'supplier' ? '/supplier/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Inscription impossible'));
    }
  };

  return (
    <main className="register-page">
      <h1>Inscrivez-vous sur ArchiPrice, c&apos;est gratuit.</h1>

      <section className="register-card" aria-label="Formulaire d'inscription">
        <form className="register-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="register-field" htmlFor="register-name">
            <span>Nom du Gestionnaire</span>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              {...register('name', { required: 'Nom complet requis' })}
            />
          </label>
          {errors.name && <small className="register-field-error">{errors.name.message}</small>}

          <label className="register-field" htmlFor="register-email">
            <span>E-mail</span>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email', { required: 'Email requis' })}
            />
          </label>
          {errors.email && <small className="register-field-error">{errors.email.message}</small>}

          <label className="register-field" htmlFor="register-category">
            <span>Catégorie</span>
            <select
              id="register-category"
              aria-invalid={Boolean(errors.category)}
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              {...register('category', { required: 'Catégorie requise' })}
            >
              {ACTIVITY_SECTORS.map((sector) => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
              <option value={CATEGORY_OTHER_VALUE}>Autres</option>
            </select>
          </label>
          {errors.category && <small className="register-field-error">{errors.category.message}</small>}

          {isCustomCategory && (
            <>
              <label className="register-field" htmlFor="register-custom-category">
                <span>Catégorie personnalisée</span>
                <input
                  id="register-custom-category"
                  type="text"
                  autoComplete="organization-title"
                  placeholder="Votre secteur d’activité"
                  aria-invalid={Boolean(errors.customCategory)}
                  {...register('customCategory', {
                    validate: (value) => (
                      !isCustomCategory || Boolean(value?.trim()) || 'Catégorie personnalisée requise'
                    ),
                  })}
                />
              </label>
              {errors.customCategory && <small className="register-field-error">{errors.customCategory.message}</small>}
            </>
          )}

          <label className="register-field" htmlFor="register-password">
            <span>Mot de passe</span>
            <span className="register-password-control">
              <input
                id="register-password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password', {
                  required: 'Mot de passe requis',
                  minLength: { value: 6, message: 'Minimum 6 caractères' },
                })}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
              >
                {isPasswordVisible ? 'Masquer' : 'Afficher'}
              </button>
            </span>
          </label>
          {errors.password && <small className="register-field-error">{errors.password.message}</small>}

          {accountType === 'supplier' && (
            <>
              <label className="register-field" htmlFor="register-company">
                <span>Nom de la boutique</span>
                <input
                  id="register-company"
                  type="text"
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.companyName)}
                  {...register('companyName', {
                    required: 'Nom de la boutique requis',
                  })}
                />
              </label>
              {errors.companyName && <small className="register-field-error">{errors.companyName.message}</small>}

              <label className="register-field" htmlFor="register-phone">
                <span>Téléphone</span>
                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  {...register('phone', { required: 'Téléphone requis' })}
                />
              </label>
              {errors.phone && <small className="register-field-error">{errors.phone.message}</small>}

              <label className="register-field" htmlFor="register-city">
                <span>Ville</span>
                <input
                  id="register-city"
                  type="text"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.city)}
                  {...register('city', { required: 'Ville requise' })}
                />
              </label>
              {errors.city && <small className="register-field-error">{errors.city.message}</small>}

              <label className="register-field" htmlFor="register-neighborhood">
                <span>Quartier</span>
                <input
                  id="register-neighborhood"
                  type="text"
                  autoComplete="address-line2"
                  aria-invalid={Boolean(errors.neighborhood)}
                  {...register('neighborhood', { required: 'Quartier requis' })}
                />
              </label>
              {errors.neighborhood && <small className="register-field-error">{errors.neighborhood.message}</small>}
            </>
          )}

          
          {apiError && (
            <Alert variant="danger" title="Inscription impossible" onClose={() => setApiError(null)}>
              {apiError}
            </Alert>
          )}

          <button type="submit" className="register-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Inscription...' : 'Suivant'}
          </button>
        </form>

        <div className="register-separator">
          <span />
          <strong>ou</strong>
          <span />
        </div>

        

        <p className="register-login-link">
          Déjà inscrit(e) ? <Link to="/login">S&apos;identifier</Link>
        </p>
      </section>
    </main>
  );
}
