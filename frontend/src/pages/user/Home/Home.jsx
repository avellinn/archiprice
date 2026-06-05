import './Home.css';
import { Link, Navigate } from 'react-router-dom';
import { Icon } from '../../../components/ui';
import useAuth from '../../../context/useAuth';

const roleOptions = [
  {
    id: 'user',
    title: 'Client ou porteur de projet',
    description: 'Créer un compte pour simuler et suivre mes projets',
    icon: 'AccountCircle',
    to: '/register?accountType=user',
    cta: 'Continuer',
  },
  {
    id: 'supplier',
    title: 'Fournisseur ou boutique partenaire',
    description: 'Créer une demande de partenariat fournisseur',
    icon: 'Workspaces',
    to: '/register?accountType=supplier',
    cta: 'Continuer',
  },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="home-role-page">
      <section className="home-role-panel" aria-labelledby="home-role-title">
        <h1 id="home-role-title">Bienvenue sur ArchiPrice</h1>

        <div className="home-role-content">
          <h2>Sélectionnez votre rôle</h2>

          <div className="home-role-list">
            {roleOptions.map((role) => (
              <article key={role.id} className="home-role-card">
                <span className="home-role-card__icon" aria-hidden="true">
                  <Icon name={role.icon} size="lg" />
                </span>
                <div>
                  <h3>{role.title}</h3>
                  <p>{role.description}</p>
                </div>
                <Link to={role.to} className="home-role-card__button">
                  {role.cta}
                </Link>
              </article>
            ))}
          </div>

          

          <p className="home-role-login">
            Vous avez déjà un compte ? <Link to="/login">Connectez-vous</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
