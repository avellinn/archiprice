import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}




function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function Header({
  currentPage = 'Tableau de bord',
  isSidebarCollapsed = false,
  isThemeDark = false,
  isNotificationsOpen = false,
  isAccountOpen = false,
  searchValue = '',
  onAccountClick,
  onMenuClick,
  onNotificationsClick,
  onSearchChange,
  onSearchSubmit,
  onThemeToggle,
  onLogout,
}) {
  const { user, isAuthenticated } = useAuth();

  function handleSearchSubmit(event) {
    event.preventDefault();
    onSearchSubmit?.();
  }

  if (isAuthenticated) {
    return (
      <header className="header app-navbar">
        <div className="navbar-left">
          <button
            type="button"
            className="navbar-menu"
            aria-label={isSidebarCollapsed ? 'Afficher le menu' : 'Masquer le menu'}
            aria-pressed={isSidebarCollapsed}
            onClick={onMenuClick}
          >
            <span />
            <span />
            <span />
          </button>
          <nav className="navbar-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <strong>{currentPage}</strong>
          </nav>
        </div>

        <div className="navbar-right">
          <form className="navbar-search" onSubmit={handleSearchSubmit}>
            <SearchIcon />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher"
            />
            <kbd>⌘/</kbd>
          </form>

          <button
            type="button"
            className="navbar-icon-button"
            aria-label={isThemeDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
            aria-pressed={isThemeDark}
            onClick={onThemeToggle}
          >
            <SunIcon />
          </button>
          <button
            type="button"
            className="navbar-icon-button"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
            onClick={onNotificationsClick}
          >
            <BellIcon />
          </button>

          <div className="navbar-account-wrap">
            <button
              type="button"
              className="navbar-account"
              aria-label={`Compte ${user?.name || 'CIF'}`}
              aria-expanded={isAccountOpen}
              onClick={onAccountClick}
            >
              <span className="navbar-avatar">C</span>
              <strong>CIF</strong>
              <ChevronIcon />
            </button>

            {isAccountOpen && (
              <div className="navbar-account-menu">
                <Link to="/dashboard">Mon espace</Link>
                <button type="button" onClick={onLogout}>
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo">
        ArchiPrice
      </Link>
      <nav>
        <Link to="/login">Connexion</Link>
        <Link to="/register">Inscription</Link>
      </nav>
    </header>
  );
}
