import { useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import Icon from './Icon';

function getInitials(user) {
  if (user?.initials) return user.initials;
  if (user?.name) {
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return '?';
}

export default function Sidebar({
  logo,
  title,
  sections = [],
  activeItemId,
  onItemClick,
  user,
  isOpen = true,
  onClose,
  isMobile = false,
}) {
  const location = useLocation();
  const visibleSections = sections.filter((section) => section?.items?.length);

  const pathMap = useMemo(
    () => ({
      dashboard: '/dashboard',
      'explorer-catalogue': '/catalogue',
      workspace: '/workspace',
      invoices: '/factures',
      logout: '/deconnexion',
      demandes: '/demandes',
      lettre: '/lettre',
      historique: '/historique',
      parametres: '/parametres',
    }),
    [],
  );

  const getItemPath = useCallback(
    (item) => {
      if (item.path) return item.path;
      return pathMap[item.id] || `/${item.id}`;
    },
    [pathMap],
  );

  const isItemActive = useCallback(
    (item) => {
      if (item.action) return false;

      if (activeItemId) {
        return item.id === activeItemId;
      }

      const itemPath = getItemPath(item);
      return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
    },
    [activeItemId, getItemPath, location.pathname],
  );

  const handleActionClick = useCallback(
    (event, item) => {
      event.preventDefault();
      onItemClick?.(item.id);

      if (isMobile && onClose) {
        onClose();
      }
    },
    [isMobile, onClose, onItemClick],
  );

  const handleItemClick = useCallback(
    (event, item) => {
      onItemClick?.(item.id);

      const itemPath = getItemPath(item);
      const isActive = location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

      if (isMobile && !isActive && onClose) {
        onClose();
      }

      if (isActive) {
        event.preventDefault();
      }
    },
    [getItemPath, isMobile, location.pathname, onClose, onItemClick],
  );

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
      <div className="sidebar__header">
        <div className="sidebar__header-content">
          {logo && <div className="sidebar__logo">{logo}</div>}
          {title && <div className="sidebar__title">{title}</div>}
        </div>
        {isMobile && isOpen && onClose && (
          <button className="sidebar__close-btn" onClick={onClose} aria-label="Fermer le menu" type="button">
            <Icon name="Close" size="lg" />
          </button>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Navigation principale">
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.id || section.title || `section-${sectionIndex}`} className="sidebar__section">
            <ul className="sidebar__nav-list">
              {section.items.map((item) => {
                if (!item?.id) return null;

                const isActive = isItemActive(item);
                const itemPath = getItemPath(item);
                const linkClassName = ['sidebar__nav-link', isActive ? 'sidebar__nav-link--active' : '']
                  .filter(Boolean)
                  .join(' ');
                const itemContent = (
                  <>
                    {item.icon && <span className="sidebar__nav-icon">{item.icon}</span>}
                    <span className="sidebar__nav-label">{item.label}</span>
                    {item.badge !== undefined && <span className="sidebar__nav-badge">{item.badge}</span>}
                  </>
                );

                return (
                  <li key={item.id} className="sidebar__nav-item">
                    {item.action ? (
                      <button
                        type="button"
                        className={linkClassName}
                        onClick={(event) => handleActionClick(event, item)}
                      >
                        {itemContent}
                      </button>
                    ) : (
                      <Link
                        to={itemPath}
                        className={linkClassName}
                        onClick={(event) => handleItemClick(event, item)}
                      >
                        {itemContent}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="sidebar__footer">
          <Link to="/workspace" className="sidebar__user" aria-label="Accéder à mon espace de travail">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name || 'Profil utilisateur'} className="sidebar__user-avatar" />
            ) : (
              <div
                className="sidebar__user-avatar sidebar__user-avatar--initials"
                style={{ backgroundColor: user.avatarColor }}
              >
                {getInitials(user)}
              </div>
            )}
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user.name || 'Utilisateur'}</div>
              {user.email && <div className="sidebar__user-email">{user.email}</div>}
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
