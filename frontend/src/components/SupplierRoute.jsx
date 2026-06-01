import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import Text from './Text';

export default function SupplierRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
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

  if (user?.role !== 'supplier') {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return children;
}
