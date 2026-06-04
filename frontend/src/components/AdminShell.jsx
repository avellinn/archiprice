import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Icon from './Icon';
import Sidebar from './Sidebar';
import useAuth from '../context/useAuth';
import { fetchAdminSupportItems, fetchAdminUsers, fetchSupplierRequests } from '../services/adminMongo';
import { syncAdminDataFromRemote, useAdminData } from '../services/adminData';
import { connectRealtime } from '../services/realtime';
import { getAdminTranslations } from '../utils/adminLanguage';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';
const ADMIN_SEARCH_ICONS = {
  '/admin/dashboard': 'Dashboard',
  '/admin/catalogue/products': 'Tag',
  '/admin/catalogue/filters': 'Explore',
  '/admin/suppliers': 'Workspaces',
  '/admin/suppliers/requests': 'Notifications',
  '/admin/users': 'AccountCircle',
  '/admin/simulations': 'ReceiptLong',
  '/admin/support': 'Chat',
  '/admin/settings': 'Info',
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
  const adminText = getAdminTranslations(adminData);
  const [pendingSupplierRequests, setPendingSupplierRequests] = useState([]);
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [lastSeenUsersAt, setLastSeenUsersAt] = useState(() => (
    Number(window.localStorage.getItem('archiprice:admin-notifications-seen-at') || 0)
  ));
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState(() => (
    readDismissedNotificationKeys(ADMIN_DISMISSED_NOTIFICATIONS_KEY)
  ));

  const refreshNotifications = useCallback(async () => {
    try {
      const [requests, users, supportItems] = await Promise.all([
        fetchSupplierRequests(),
        fetchAdminUsers(),
        fetchAdminSupportItems(),
      ]);

      setPendingSupplierRequests(requests.filter((request) => request.status === 'pending'));
      setRecentUsers(
        users
          .filter((item) => String(item.role || '').toLowerCase() === 'user')
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5),
      );
      setRecentFeedbacks(
        supportItems
          .filter((item) => item.tab === 'feedback')
          .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
          .slice(0, 8),
      );
    } catch {
      setPendingSupplierRequests([]);
      setRecentUsers([]);
      setRecentFeedbacks([]);
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

  useEffect(() => connectRealtime({
    onEvent: (event) => {
      if (event?.type === 'connected') return;
      refreshNotifications();
      syncAdminDataFromRemote().catch(() => {});
    },
  }), [refreshNotifications]);

  const unseenRecentUsers = useMemo(
    () => recentUsers.filter((item) => new Date(item.createdAt || 0).getTime() > lastSeenUsersAt),
    [lastSeenUsersAt, recentUsers],
  );
  const pendingPublications = useMemo(() => (
    (adminData?.products || []).filter((product) => product.publicationStatus === 'En attente')
  ), [adminData?.products]);
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
  const allFeedbackNotifications = useMemo(() => {
    const byId = new Map();
    [...(adminData?.supportItems || []), ...recentFeedbacks].forEach((item) => {
      if (item?.id && item.tab === 'feedback') byId.set(item.id, item);
    });
    return [...byId.values()]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 8);
  }, [adminData?.supportItems, recentFeedbacks]);
  const visibleFeedbacks = useMemo(() => (
    allFeedbackNotifications.filter((item) => !dismissedNotificationKeys.includes(`feedback-${item.id}`))
  ), [allFeedbackNotifications, dismissedNotificationKeys]);
  const visibleNotificationKeys = useMemo(() => [
    ...visibleSupplierRequests.map((request) => `supplier-request-${request.id}`),
    ...visiblePublications.map((product) => `publication-${product.id}`),
    ...visibleRecentUsers.map((item) => `user-${item.id}`),
    ...visibleFeedbacks.map((item) => `feedback-${item.id}`),
  ], [visibleFeedbacks, visiblePublications, visibleRecentUsers, visibleSupplierRequests]);
  const notificationCount = visibleSupplierRequests.length + visibleUnseenRecentUsers.length + visiblePublications.length + visibleFeedbacks.length;
  const visiblePanelNotificationCount = visibleSupplierRequests.length + visibleRecentUsers.length + visiblePublications.length + visibleFeedbacks.length;

  const sidebarSections = useMemo(
    () => [
      {
        title: adminText.sidebar.section,
        items: [
          {
            id: 'admin-dashboard',
            label: adminText.sidebar.dashboard,
            path: '/admin/dashboard',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'admin-catalogue',
            label: adminText.sidebar.catalogue,
            icon: <Icon name="Explore" />,
            defaultOpen: true,
            children: [
              {
                id: 'admin-products',
                label: adminText.sidebar.articles,
                path: '/admin/catalogue/products',
              },
              {
                id: 'admin-catalogue-filters',
                label: adminText.sidebar.filters,
                path: '/admin/catalogue/filters',
              },
            ],
          },
          {
            id: 'admin-suppliers',
            label: adminText.sidebar.suppliers,
            icon: <Icon name="Workspaces" />,
            defaultOpen: true,
            children: [
              {
                id: 'admin-suppliers-list',
                label: adminText.sidebar.suppliersList,
                path: '/admin/suppliers',
                exact: true,
              },
              {
                id: 'admin-supplier-requests',
                label: adminText.sidebar.requests,
                path: '/admin/suppliers/requests',
                badge: pendingSupplierRequests.length || undefined,
              },
            ],
          },
          {
            id: 'admin-users',
            label: adminText.sidebar.users,
            path: '/admin/users',
            icon: <Icon name="Workspaces" />,
          },
          {
            id: 'admin-simulations',
            label: adminText.sidebar.simulations,
            path: '/admin/simulations',
            icon: <Icon name="ReceiptLong" />,
          },
          {
            id: 'admin-support',
            label: adminText.sidebar.support,
            path: '/admin/support',
            icon: <Icon name="Chat" />,
          },
          {
            id: 'admin-settings',
            label: adminText.sidebar.settings,
            path: '/admin/settings',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'logout',
            label: adminText.sidebar.logout,
            path: '/deconnexion',
            icon: <Icon name="Logout" />,
          },
        ],
      },
    ],
    [adminText, pendingSupplierRequests.length],
  );

  function handleSearchSubmit(payload = {}) {
    const query = payload.query ?? searchValue.trim();
    const indexedCount = Array.isArray(payload.matches) ? payload.matches.length : 0;
    const suffix = query ? ` · ${indexedCount} résultat(s) indexé(s)` : '';
    setSearchMessage(`${adminText.search.message(query)}${suffix}`);
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

  const currentPage = adminText.pageTitles[location.pathname] || adminText.pageTitles.fallback;
  const searchValue = searchParams.get('q') || '';
  const searchIcon = ADMIN_SEARCH_ICONS[location.pathname] || 'Search';
  const searchPlaceholder = adminText.search.placeholder(currentPage);

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
          searchIcon={searchIcon}
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
              <strong>{adminText.notifications.title}</strong>
              <button type="button" aria-label={adminText.notifications.close} onClick={dismissVisibleNotifications}>
                <Icon name="Close" size="sm" />
              </button>
            </div>
            {visiblePanelNotificationCount === 0 ? (
              <span>{adminText.notifications.empty}</span>
            ) : (
              <div className="notification-panel__list">
                {visibleSupplierRequests.map((request) => (
                  <Link key={request.id} to="/admin/suppliers/requests" className="notification-panel__item">
                    <Icon name="Workspaces" size="sm" />
                    <span>
                      {adminText.notifications.supplierRequest} : <b>{request.companyName}</b>
                    </span>
                  </Link>
                ))}
                {visiblePublications.map((product) => (
                  <Link key={product.id} to="/admin/catalogue/products" className="notification-panel__item">
                    <Icon name="Tag" size="sm" />
                    <span>
                      {adminText.notifications.publication} : <b>{product.name}</b>
                    </span>
                  </Link>
                ))}
                {visibleRecentUsers.map((item) => (
                  <Link key={item.id} to="/admin/users" className="notification-panel__item">
                    <Icon name="AccountCircle" size="sm" />
                    <span>
                      {adminText.notifications.newUser} : <b>{item.name || item.email}</b>
                    </span>
                  </Link>
                ))}
                {visibleFeedbacks.map((item) => (
                  <Link key={item.id} to="/admin/support" className="notification-panel__item">
                    <Icon name="Chat" size="sm" />
                    <span>
                      {adminText.notifications.newFeedback(item.sourceRole)} : <b>{item.subject}</b>
                      <small>{item.user || item.email}</small>
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
