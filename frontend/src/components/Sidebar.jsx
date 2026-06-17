import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  variant = 'user',
  sections = [],
  activeItemId,
  onItemClick,
  logoTo,
  logoLabel = 'Aller au tableau de bord',
  user,
  userLink = '/workspace',
  userLinkLabel = 'Accéder à mon espace de travail',
  isOpen = true,
  onClose,
  isMobile = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleSections = sections.filter((section) => section?.items?.length);
  const [openSubmenus, setOpenSubmenus] = useState(() => {
    const initialState = {};
    sections.forEach((section) => {
      section?.items?.forEach((item) => {
        if (item?.children?.length) {
          initialState[item.id] = item.defaultOpen ?? false;
        }
      });
    });
    return initialState;
  });
  const [hoveredSubmenuId, setHoveredSubmenuId] = useState(null);
  const logoContent = logoTo ? (
    <Link to={logoTo} className="sidebar__logo-link" aria-label={logoLabel}>
      {logo}
    </Link>
  ) : logo;

  const pathMap = useMemo(
    () => ({
      dashboard: '/dashboard',
      'explorer-catalogue': '/catalogue',
      workspace: '/workspace',
      demande: '/demande',
      archives: '/archives',
      support: '/support',
      'supplier-support': '/supplier/support',
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

  const isLeafItemActive = useCallback(
    (item) => {
      if (item.action) return false;

      if (activeItemId) {
        return item.id === activeItemId;
      }

      const itemPath = getItemPath(item);
      if (item.exact) {
        return location.pathname === itemPath;
      }

      return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
    },
    [activeItemId, getItemPath, location.pathname],
  );

  const isItemActive = useCallback(
    (item) => {
      if (item.children?.length) {
        return item.children.some((child) => isLeafItemActive(child));
      }

      return isLeafItemActive(item);
    },
    [isLeafItemActive],
  );

  const toggleSubmenu = useCallback(
    (item) => {
      onItemClick?.(item.id);
      setOpenSubmenus((currentState) => ({
        ...currentState,
        [item.id]: !(currentState[item.id] ?? item.defaultOpen ?? false),
      }));
    },
    [onItemClick],
  );

  const handleSubmenuMouseEnter = useCallback((item) => {
    if (item.children?.length) {
      setHoveredSubmenuId(item.id);
      setOpenSubmenus((currentState) => ({
        ...currentState,
        [item.id]: true,
      }));
    }
  }, []);

  const handleSubmenuMouseLeave = useCallback((item) => {
    if (item.children?.length) {
      setHoveredSubmenuId((currentId) => (currentId === item.id ? null : currentId));
    }
  }, []);

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
      const isActive = item.exact
        ? location.pathname === itemPath
        : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

      if (isMobile && !isActive && onClose) {
        onClose();
      }

      if (isActive) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      navigate(itemPath);
    },
    [getItemPath, isMobile, location.pathname, navigate, onClose, onItemClick],
  );

  return (
    <aside className={`sidebar sidebar--${variant} ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
      <div className="sidebar__header">
        <div className="sidebar__header-content">
          {logo && <div className="sidebar__logo">{logoContent}</div>}
          {title && variant !== 'admin' && <div className="sidebar__title">{title}</div>}
        </div>
        {isMobile && isOpen && onClose && (
          <button className="sidebar__close-btn" onClick={onClose} aria-label="Fermer le menu" type="button">
            <Icon name="Close" size="lg" />
          </button>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Navigation principale">
        {visibleSections.map((section, sectionIndex) => (
          <div key={`${section.id || section.title || 'section'}-${sectionIndex}`} className="sidebar__section">
            <ul className="sidebar__nav-list">
              {section.items.map((item, itemIndex) => {
                if (!item?.id) return null;

                const isActive = isItemActive(item);
                const hasChildren = Boolean(item.children?.length);
                const isSubmenuOpen = hasChildren
                  ? Boolean(openSubmenus[item.id] ?? item.defaultOpen ?? false) || hoveredSubmenuId === item.id
                  : false;
                const itemPath = getItemPath(item);
                const linkClassName = [
                  'sidebar__nav-link',
                  hasChildren ? 'sidebar__nav-link--parent' : '',
                  isActive ? 'sidebar__nav-link--active' : '',
                  isSubmenuOpen ? 'sidebar__nav-link--open' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const itemContent = (
                  <>
                    {item.icon && <span className="sidebar__nav-icon">{item.icon}</span>}
                    <span className="sidebar__nav-label">{item.label}</span>
                    {item.badge !== undefined && <span className="sidebar__nav-badge">{item.badge}</span>}
                    {hasChildren && (
                      <span className="sidebar__nav-chevron">
                        <Icon name="ChevronDown" size="sm" />
                      </span>
                    )}
                  </>
                );

                return (
                  <li
                    key={`${item.id}-${itemIndex}`}
                    className="sidebar__nav-item"
                    onMouseEnter={() => handleSubmenuMouseEnter(item)}
                    onMouseLeave={() => handleSubmenuMouseLeave(item)}
                  >
                    {hasChildren ? (
                      <>
                        <button
                          type="button"
                          className={linkClassName}
                          aria-expanded={isSubmenuOpen}
                          onClick={() => toggleSubmenu(item)}
                        >
                          {itemContent}
                        </button>
                        {isSubmenuOpen && (
                          <ul className="sidebar__submenu">
                            {item.children.map((child, childIndex) => {
                              const childPath = getItemPath(child);
                              const childActive = isItemActive(child);

                              return (
                                <li key={`${child.id}-${childIndex}`} className="sidebar__submenu-item">
                                  <Link
                                    to={childPath}
                                    className={[
                                      'sidebar__submenu-link',
                                      childActive ? 'sidebar__submenu-link--active' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    onClick={(event) => handleItemClick(event, child)}
                                  >
                                    <span>{child.label}</span>
                                    {child.badge !== undefined && (
                                      <span className="sidebar__nav-badge">{child.badge}</span>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    ) : item.action ? (
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
                        state={itemPath === '/catalogue' ? { from: location } : undefined}
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
          <Link to={userLink} className="sidebar__user" aria-label={userLinkLabel}>
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
