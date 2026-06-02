import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Icon from './Icon';
import Sidebar from './Sidebar';
import useAuth from '../context/useAuth';
import { fetchAdminUsers, fetchSupplierRequests } from '../services/adminMongo';
import { useAdminData } from '../services/adminData';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';

const ADMIN_PAGE_TITLES = {
  '/admin/dashboard': 'Tableau de bord admin',
  '/admin/catalogue/products': 'Articles',
  '/admin/catalogue/filters': 'Catégories & filtres',
  '/admin/suppliers': 'Fournisseurs',
  '/admin/suppliers/requests': 'Nouvelles demandes',
  '/admin/users': 'Administration utilisateurs',
  '/admin/simulations': 'Simulations',
  '/admin/support': 'Support',
  '/admin/settings': 'Paramètres',
};

const ADMIN_DISMISSED_NOTIFICATIONS_KEY = 'archiprice:admin-dismissed-notifications';

function readDismissedNotificationKeys(storageKey) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
}

function writeDismissedNotificationKeys(storageKey, keys) {
  window.localStorage.setItem(storageKey, JSON.stringify([...new Set(keys)]));
}

export default function AdminShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [adminData] = useAdminData();
  const [pendingSupplierRequests, setPendingSupplierRequests] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [lastSeenUsersAt, setLastSeenUsersAt] = useState(() => (
    Number(window.localStorage.getItem('archiprice:admin-notifications-seen-at') || 0)
  ));
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState(() => (
    readDismissedNotificationKeys(ADMIN_DISMISSED_NOTIFICATIONS_KEY)
  ));

  const refreshNotifications = useCallback(async () => {
    try {
      const [requests, users] = await Promise.all([
        fetchSupplierRequests(),
        fetchAdminUsers(),
      ]);

      setPendingSupplierRequests(requests.filter((request) => request.status === 'pending'));
      setRecentUsers(
        users
          .filter((item) => String(item.role || '').toLowerCase() === 'user')
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5),
      );
    } catch {
      setPendingSupplierRequests([]);
      setRecentUsers([]);
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      refreshNotifications();
    }, 0);

    return () => {
      window.clearTimeout(refreshTimer);
    };
  }, [refreshNotifications, location.pathname]);

  const unseenRecentUsers = useMemo(
    () => recentUsers.filter((item) => new Date(item.createdAt || 0).getTime() > lastSeenUsersAt),
    [lastSeenUsersAt, recentUsers],
  );
  const pendingPublications = useMemo(() => (
    (adminData.products || []).filter((product) => product.publicationStatus === 'En attente')
  ), [adminData.products]);
  const visibleSupplierRequests = useMemo(() => (
    pendingSupplierRequests.filter((request) => !dismissedNotificationKeys.includes(`supplier-request-${request.id}`))
  ), [dismissedNotificationKeys, pendingSupplierRequests]);
  const visiblePublications = useMemo(() => (
    pendingPublications.filter((product) => !dismissedNotificationKeys.includes(`publication-${product.id}`))
  ), [dismissedNotificationKeys, pendingPublications]);
  const visibleRecentUsers = useMemo(() => (
    recentUsers.filter((item) => !dismissedNotificationKeys.includes(`user-${item.id}`))
  ), [dismissedNotificationKeys, recentUsers]);
  const visibleUnseenRecentUsers = useMemo(() => (
    unseenRecentUsers.filter((item) => !dismissedNotificationKeys.includes(`user-${item.id}`))
  ), [dismissedNotificationKeys, unseenRecentUsers]);
  const visibleNotificationKeys = useMemo(() => [
    ...visibleSupplierRequests.map((request) => `supplier-request-${request.id}`),
    ...visiblePublications.map((product) => `publication-${product.id}`),
    ...visibleRecentUsers.map((item) => `user-${item.id}`),
  ], [visiblePublications, visibleRecentUsers, visibleSupplierRequests]);
  const notificationCount = visibleSupplierRequests.length + visibleUnseenRecentUsers.length + visiblePublications.length;
  const visiblePanelNotificationCount = visibleSupplierRequests.length + visibleRecentUsers.length + visiblePublications.length;

  const sidebarSections = useMemo(
    () => [
      {
        title: 'Administration',
        items: [
          {
            id: 'admin-dashboard',
            label: 'Tableau de bord',
            path: '/admin/dashboard',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'admin-catalogue',
            label: 'Catalogue',
            icon: <Icon name="Explore" />,
            defaultOpen: true,
            children: [
              {
                id: 'admin-products',
                label: 'Articles',
                path: '/admin/catalogue/products',
              },
              {
                id: 'admin-catalogue-filters',
                label: 'Catégories & filtres',
                path: '/admin/catalogue/filters',
              },
            ],
          },
          {
            id: 'admin-suppliers',
            label: 'Fournisseurs',
            icon: <Icon name="Workspaces" />,
            defaultOpen: true,
            children: [
              {
                id: 'admin-suppliers-list',
                label: 'Liste fournisseurs',
                path: '/admin/suppliers',
              },
              {
                id: 'admin-supplier-requests',
                label: 'Nouvelles demandes',
                path: '/admin/suppliers/requests',
                badge: pendingSupplierRequests.length || undefined,
              },
            ],
          },
          {
            id: 'admin-users',
            label: 'Utilisateurs',
            path: '/admin/users',
            icon: <Icon name="Workspaces" />,
          },
          {
            id: 'admin-simulations',
            label: 'Simulations',
            path: '/admin/simulations',
            icon: <Icon name="ReceiptLong" />,
          },
          {
            id: 'admin-support',
            label: 'Support',
            path: '/admin/support',
            icon: <Icon name="Chat" />,
          },
          {
            id: 'admin-settings',
            label: 'Paramètres',
            path: '/admin/settings',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'logout',
            label: 'Déconnexion',
            path: '/deconnexion',
            icon: <Icon name="Logout" />,
          },
        ],
      },
    ],
    [pendingSupplierRequests.length],
  );

  function handleSearchSubmit() {
    const query = searchValue.trim();
    setSearchMessage(query ? `Recherche admin : ${query}` : 'Saisissez un mot-clé pour rechercher.');
  }

  function handleSearchChange(value) {
    const nextParams = new URLSearchParams(searchParams);
    const query = value.trim();

    if (query) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }

    setSearchParams(nextParams, { replace: true });
  }

  function handleNotificationsClick() {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);
    setIsAccountOpen(false);

    if (nextOpen) {
      refreshNotifications();
      const now = Date.now();
      window.localStorage.setItem('archiprice:admin-notifications-seen-at', String(now));
      setLastSeenUsersAt(now);
    }
  }

  function handleLogout() {
    setIsAccountOpen(false);
    navigate('/deconnexion');
  }

  function dismissVisibleNotifications() {
    const nextKeys = [...dismissedNotificationKeys, ...visibleNotificationKeys];
    setDismissedNotificationKeys([...new Set(nextKeys)]);
    writeDismissedNotificationKeys(ADMIN_DISMISSED_NOTIFICATIONS_KEY, nextKeys);
    setIsNotificationsOpen(false);
  }

  const currentPage = ADMIN_PAGE_TITLES[location.pathname] || 'Administration';
  const searchValue = searchParams.get('q') || '';
  const searchPlaceholder = `Rechercher dans ${currentPage.toLowerCase()}`;

  return (
    <main
      className={[
        'dashboard-shell',
        'admin-shell',
        isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
        isThemeDark ? 'is-theme-dark' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Sidebar
        logo={<img src={siteLogo} alt="ArchiPrice" />}
        title="Backoffice"
        variant="admin"
        sections={sidebarSections}
        isOpen={!isSidebarCollapsed}
        onClose={() => setIsSidebarCollapsed(true)}
        userLink="/admin/users"
        userLinkLabel="Accéder au compte administrateur"
        user={{
          initials: getUserInitials(user),
          name: getDisplayName(user),
          email: user?.email || '',
          avatarColor: getAvatarColor(user),
        }}
      />

      <section className="dashboard-content admin-shell__content">
        <Header
          currentPage={currentPage}
          isAccountOpen={isAccountOpen}
          isNotificationsOpen={isNotificationsOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          isThemeDark={isThemeDark}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          notificationCount={notificationCount}
          onAccountClick={() => {
            setIsAccountOpen((open) => !open);
            setIsNotificationsOpen(false);
          }}
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          onNotificationsClick={handleNotificationsClick}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onThemeToggle={() => setIsThemeDark((dark) => !dark)}
        />

        {isNotificationsOpen && (
          <div className="dashboard-floating-panel notification-panel">
            <div className="notification-panel__header">
              <strong>Notifications admin</strong>
              <button type="button" onClick={dismissVisibleNotifications}>
                Tout fermer
              </button>
            </div>
            {visiblePanelNotificationCount === 0 ? (
              <span>Aucune nouvelle notification backoffice.</span>
            ) : (
              <div className="notification-panel__list">
                {visibleSupplierRequests.map((request) => (
                  <Link key={request.id} to="/admin/suppliers/requests" className="notification-panel__item">
                    <Icon name="Workspaces" size="sm" />
                    <span>
                      Demande fournisseur : <b>{request.companyName}</b>
                    </span>
                  </Link>
                ))}
                {visiblePublications.map((product) => (
                  <Link key={product.id} to="/admin/catalogue/products" className="notification-panel__item">
                    <Icon name="Inventory" size="sm" />
                    <span>
                      Publication fournisseur : <b>{product.name}</b>
                    </span>
                  </Link>
                ))}
                {visibleRecentUsers.map((item) => (
                  <Link key={item.id} to="/admin/users" className="notification-panel__item">
                    <Icon name="AccountCircle" size="sm" />
                    <span>
                      Nouvelle inscription user : <b>{item.name || item.email}</b>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {searchMessage && (
          <button
            type="button"
            className="dashboard-search-message"
            onClick={() => setSearchMessage('')}
          >
            {searchMessage}
          </button>
        )}

        <Outlet />
      </section>
    </main>
  );
}
