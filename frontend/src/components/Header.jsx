import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import './Header.css';
import Icon from './Icon';
import Text from './Text';
import useAuth from '../context/useAuth';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';

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
  const accountName = getDisplayName(user);
  const accountInitials = getUserInitials(user);
  const avatarColor = getAvatarColor(user);

  function handleSearchSubmit(event) {
    event.preventDefault();
    onSearchSubmit?.();
  }

  if (isAuthenticated) {
    return (
      <header className="header">
        <div className="header__left">
          <button
            type="button"
            className="header__menu-toggle"
            aria-label={isSidebarCollapsed ? 'Afficher le menu' : 'Masquer le menu'}
            aria-pressed={isSidebarCollapsed}
            onClick={onMenuClick}
          >
            <span />
            <span />
            <span />
          </button>
          <nav className="header__breadcrumbs" aria-label="Fil d'Ariane">
            <Link to="/" className="header__breadcrumb-link">Home</Link>
            <span className="header__breadcrumb-separator" aria-hidden="true">/</span>
            <Text as="strong" variant="medium" size="md" className="header__breadcrumb-current">
              {currentPage}
            </Text>
          </nav>
        </div>

        <div className="header__right">
          <form className="header__search" onSubmit={handleSearchSubmit}>
            <span className="header__search-icon">
              <Icon name="Search" />
            </span>
            <input
              type="search"
              className="header__search-input"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher"
            />
            <kbd className="header__search-shortcut">⌘/</kbd>
          </form>

          <div className="header__actions">
            <button
              type="button"
              className="header__icon-btn"
              aria-label={isThemeDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
              aria-pressed={isThemeDark}
              onClick={onThemeToggle}
            >
              <Icon name={isThemeDark ? 'LightMode' : 'DarkMode'} />
            </button>
            <button
              type="button"
              className="header__icon-btn header__icon-btn--notifications"
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
              onClick={onNotificationsClick}
            >
              <Icon name="Notifications" />
              <span className="header__notification-badge">0</span>
            </button>
          </div>

          <div className="header__user-wrapper">
            <button
              type="button"
              className="header__user"
              aria-label={`Compte ${accountName}`}
              aria-expanded={isAccountOpen}
              onClick={onAccountClick}
            >
              <Avatar
                name={accountName}
                initials={accountInitials}
                size="sm"
                color={avatarColor}
                className="header__user-avatar header__user-avatar--initials"
              />
              <Text as="strong" variant="medium" size="md" className="header__user-name">
                {accountName}
              </Text>
              <span className="header__user-chevron">
                <Icon name="ChevronDown" />
              </span>
            </button>

            {isAccountOpen && (
              <div className="header__user-menu">
                <Link to="/workspace" className="header__user-menu-item">Mon espace</Link>
                <hr className="header__user-menu-separator" />
                <button
                  type="button"
                  className="header__user-menu-item header__user-menu-item--danger"
                  onClick={onLogout}
                >
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
    <header className="header header--public">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo">
        <img src={siteLogo} alt="" />
        <span>ArchiPrice</span>
      </Link>
      <nav>
        <Link to="/login">Connexion</Link>
        <Link to="/register">Inscription</Link>
      </nav>
    </header>
  );
}
