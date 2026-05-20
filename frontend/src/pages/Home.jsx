import { Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Text from '../components/Text';
import useAuth from '../context/useAuth';

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
        <Text size="lg">Estimation et chiffrage pour projets d&apos;architecture.</Text>
        <Text className="muted">
          Créez un compte pour accéder à votre espace de travail et simuler vos devis.
        </Text>
        <Text as="div" className="actions">
          <Link to="/register" className="btn btn--primary btn--md">
            Créer un compte
          </Link>
          <Link to="/login">Connexion</Link>
        </Text>
      </main>
    </>
  );
}
