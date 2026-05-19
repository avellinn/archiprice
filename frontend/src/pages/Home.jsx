import { Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Header />
      <main className="page">
        <h1>ArchiPrice</h1>
        <p>Estimation et chiffrage pour projets d&apos;architecture.</p>
        <p className="muted">
          Créez un compte pour accéder à votre espace de travail et simuler vos devis.
        </p>
        <p className="actions">
          <Link to="/register" className="btn-primary btn-inline">
            Créer un compte
          </Link>
          <Link to="/login">Connexion</Link>
        </p>
      </main>
    </>
  );
}
