import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import Text from './Text';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="page">
        <Text>Chargement…</Text>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
