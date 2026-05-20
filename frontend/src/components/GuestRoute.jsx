import { Navigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import Text from './Text';

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <Text>Chargement…</Text>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
