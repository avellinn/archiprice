import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Avatar from './Avatar';
import './Header.css';
import Icon from './Icon';
import Logo from './Logo';
import Text from './Text';
import useAuth from '../context/useAuth';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';

export default function Header({
  currentPage = 'Tableau de bord',
  isSidebarCollapsed = false,
  isThemeDark = false,
  isNotificationsOpen = false,
  isAccountOpen = false,
  searchValue = '',
  searchIcon = 'Search',
  searchPlaceholder = 'Rechercher',
  onAccountClick,
  onMenuClick,
  onNotificationsClick,
  onSearchChange,
  onSearchSubmit,
  onThemeToggle,
  onLogout,
  notificationCount = 0,
}) {
  const { user, isAuthenticated } = useAuth();
  const accountName = getDisplayName(user);
  const accountInitials = getUserInitials(user);
  const avatarColor = getAvatarColor(user);
  const accountSpacePath = user?.role === 'admin'
    ? '/admin/settings'
    : user?.role === 'supplier'
      ? '/supplier/settings'
      : '/parametres';
  const [pageSearchIndex, setPageSearchIndex] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchQuery = searchValue.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];

    return pageSearchIndex.filter((entry) => entry.toLowerCase().includes(searchQuery)).slice(0, 8);
  }, [pageSearchIndex, searchQuery]);
  const visibleSearchEntries = useMemo(() => (
    searchQuery ? searchMatches : pageSearchIndex.slice(0, 8)
  ), [pageSearchIndex, searchMatches, searchQuery]);
  const shouldShowSearchIndex = isSearchFocused && visibleSearchEntries.length > 0;
  const effectiveSearchIcon = searchQuery
    ? (searchMatches.length > 0 ? 'CheckCircle' : 'Info')
    : searchIcon;
  const safeNotificationCount = Math.max(Number(notificationCount) || 0, 0);
  const hasNotifications = safeNotificationCount > 0;
  const searchDatalistId = `header-search-index-${String(currentPage).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'page'}`;

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return undefined;

    let animationFrame = 0;
    const root = document.querySelector('.dashboard-content');
    if (!root) return undefined;

    function collectSearchIndex() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const values = new Set();
        const nodes = root.querySelectorAll('h1,h2,h3,h4,p,li,td,th,strong,span,small,label,button,a,dt,dd');

        nodes.forEach((node) => {
          if (
            node.closest('.header')
            || node.closest('.dashboard-floating-panel')
            || node.closest('.dashboard-search-message')
            || node.closest('.header__search-index')
          ) {
            return;
          }

          const text = node.textContent?.replace(/\s+/g, ' ').trim();
          if (!text || text.length < 2 || text.length > 120) return;
          values.add(text);
        });

        setPageSearchIndex([...values].slice(0, 160));
      });
    }

    collectSearchIndex();
    const observer = new MutationObserver(collectSearchIndex);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [currentPage, isAuthenticated]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    onSearchSubmit?.({ query: searchValue.trim(), matches: searchMatches });
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
              <Icon name={effectiveSearchIcon} />
            </span>
            <input
              type="search"
              className="header__search-input"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-expanded={shouldShowSearchIndex}
              aria-controls={`${searchDatalistId}-panel`}
              list={searchDatalistId}
            />
            <datalist id={searchDatalistId}>
              {searchMatches.map((match) => (
                <option key={match} value={match} />
              ))}
            </datalist>
            {shouldShowSearchIndex && (
              <div className="header__search-index" id={`${searchDatalistId}-panel`} role="listbox">
                <span className="header__search-index-title">
                  {searchQuery ? 'Résultats indexés' : 'Éléments indexés'}
                </span>
                {visibleSearchEntries.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    role="option"
                    className="header__search-index-item"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSearchChange?.(entry);
                      onSearchSubmit?.({ query: entry, matches: [entry] });
                      setIsSearchFocused(false);
                    }}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            )}
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
              className={[
                'header__icon-btn',
                'header__icon-btn--notifications',
                hasNotifications ? 'has-notifications' : '',
              ].filter(Boolean).join(' ')}
              aria-label={hasNotifications ? `${safeNotificationCount} notification(s)` : 'Notifications'}
              aria-expanded={isNotificationsOpen}
              onClick={onNotificationsClick}
            >
              <Icon name="Notifications" />
              {hasNotifications && (
                <span className="header__notification-badge">
                  {safeNotificationCount > 99 ? '99+' : safeNotificationCount}
                </span>
              )}
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
                <Link to={accountSpacePath} className="header__user-menu-item">Mon espace</Link>
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
        <Logo variant="public" alt="" showText />
      </Link>
      <nav>
        <Link to="/login">Connexion</Link>
        <Link to="/register">Inscription</Link>
      </nav>
    </header>
  );
}
