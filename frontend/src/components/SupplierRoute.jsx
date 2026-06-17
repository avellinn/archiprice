import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuth from '../context/useAuth';
import { fetchSupplierProfile } from '../services/supplier';
import { Loader } from './ui';

export default function SupplierRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [isSupplierProfileValid, setIsSupplierProfileValid] = useState(null);

  useEffect(() => {
    if (loading || !isAuthenticated || user?.role !== 'supplier') {
      return undefined;
    }

    let cancelled = false;

    fetchSupplierProfile()
      .then((profile) => {
        if (!cancelled) setIsSupplierProfileValid(Boolean(profile));
      })
      .catch(() => {
        if (!cancelled) setIsSupplierProfileValid(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, user?.id, user?.role]);

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

  if (user?.role !== 'supplier') {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  if (isSupplierProfileValid === null) {
    return (
      <main className="page">
        <Loader />
      </main>
    );
  }

  if (!isSupplierProfileValid) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
