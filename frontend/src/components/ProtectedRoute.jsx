import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { Loader } from './ui';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="page">
        <Loader />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'admin' && location.pathname !== '/deconnexion') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.role === 'supplier' && location.pathname !== '/deconnexion') {
    return <Navigate to="/supplier/dashboard" replace />;
  }

  return children;
}
