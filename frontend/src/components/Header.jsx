import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="header">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo">
        ArchiPrice
      </Link>
      <nav>
        {isAuthenticated ? (
          <>
            <span className="user-name">{user?.name || user?.email}</span>
            <Link to="/dashboard">Dashboard</Link>
            <button type="button" className="btn-link" onClick={logout}>
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        )}
      </nav>
    </header>
  );
}
