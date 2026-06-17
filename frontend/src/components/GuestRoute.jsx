import { Navigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { Loader } from './ui';

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <Loader />
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'supplier' ? '/supplier/dashboard' : '/dashboard'} replace />;
  }

  return children;
}
