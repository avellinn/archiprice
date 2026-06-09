import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Logo from './Logo';
import Sidebar from './Sidebar';
import { Icon } from './ui';
import useAuth from '../context/useAuth';
import { syncAdminDataFromRemote, useAdminData } from '../services/adminData';
import { connectRealtime } from '../services/realtime';
import { fetchMySupportItems } from '../services/support';
import { fetchSupplierWorkspace, notifySupplierWorkspaceChange } from '../services/supplier';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import { getSupplierLanguage, getSupplierTranslations } from '../utils/supplierLanguage';

const SUPPLIER_DISMISSED_NOTIFICATIONS_KEY = 'archiprice:supplier-dismissed-notifications';
const SUPPLIER_SEARCH_ICONS = {
  '/supplier/dashboard': 'Dashboard',
  '/supplier/shop': 'Workspaces',
  '/supplier/products': 'ReceiptLong',
  '/supplier/products/new': 'Add',
  '/supplier/clients': 'Visibility',
  '/supplier/demande': 'Storefront',
  '/supplier/content/files': 'Folder',
  '/supplier/support': 'Chat',
  '/supplier/settings': 'Info',
};

function readDismissedNotificationKeys() {
  try {
    return JSON.parse(window.localStorage.getItem(SUPPLIER_DISMISSED_NOTIFICATIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function normalizeSupplierKey(value) {
  return String(value || '').trim().toLowerCase();
}

function isClientNotificationForSupplier(notification, user, supplierProfile) {
  const supplierIds = [
    supplierProfile?._id,
    supplierProfile?.id,
    user?.supplierId,
    user?.supplier?._id,
    user?.supplier?.id,
    user?.id,
    user?._id,
  ].filter(Boolean).map(String);

  const supplierNames = [
    supplierProfile?.companyName,
    supplierProfile?.name,
    supplierProfile?.shopLabel,
    supplierProfile?.storeLabel,
    user?.shopName,
    user?.companyName,
    user?.storeLabel,
    user?.name,
  ].map(normalizeSupplierKey).filter(Boolean);
  const supplierContacts = [
    supplierProfile?.email,
    supplierProfile?.contact,
    user?.email,
    user?.supplier?.email,
  ].map(normalizeSupplierKey).filter(Boolean);
  const hasSupplierIdentity = supplierIds.length > 0 || supplierNames.length > 0 || supplierContacts.length > 0;

  const notificationSupplierId = String(notification.supplierId || '');
  const notificationSupplierName = normalizeSupplierKey(notification.supplierName);
  const notificationSupplierContact = normalizeSupplierKey(notification.supplierContact);

  if (!hasSupplierIdentity) return true;

  return (
    supplierIds.includes(notificationSupplierId)
    || supplierNames.includes(notificationSupplierName)
    || supplierContacts.includes(notificationSupplierContact)
  );
}

function getLastDemandMessage(notification) {
  if (Array.isArray(notification.messages) && notification.messages.length > 0) {
    return notification.messages.at(-1);
  }

  if (notification.message) {
    return {
      id: `${notification.id}-initial`,
      senderRole: 'user',
      message: notification.message,
      createdAt: notification.createdAt,
    };
  }

  return null;
}

export default function SupplierShell() {
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
  const [supportItems, setSupportItems] = useState([]);
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState(readDismissedNotificationKeys);
  const supplierLanguage = getSupplierLanguage(adminData);
  const supplierText = getSupplierTranslations(supplierLanguage);

  const refreshSupportNotifications = useCallback(async () => {
    try {
      setSupportItems(await fetchMySupportItems());
    } catch {
      setSupportItems([]);
    }
  }, []);

  useEffect(() => connectRealtime({
    onEvent: (event) => {
      if (event?.type === 'connected') return;
      notifySupplierWorkspaceChange({ action: event.type, source: 'realtime' });
      syncAdminDataFromRemote().catch(() => {});
      refreshSupportNotifications();
    },
  }), [refreshSupportNotifications]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(refreshSupportNotifications, 0);
    return () => {
      window.clearTimeout(refreshTimer);
    };
  }, [refreshSupportNotifications, location.pathname]);

  useEffect(() => {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((workspace) => {
        if (!cancelled) setSupplierProfile(workspace?.supplier || null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const publicationNotices = useMemo(() => {
    const userIds = [user?.id, user?._id].filter(Boolean).map(String);
    const notices = adminData.supplierPublicationNotices || [];

    if (userIds.length === 0) return notices;

    return notices.filter((notice) => !notice.supplierUserId || userIds.includes(String(notice.supplierUserId)));
  }, [adminData.supplierPublicationNotices, user]);
  const visiblePublicationNotices = useMemo(() => (
    publicationNotices.filter((notice) => !dismissedNotificationKeys.includes(`supplier-notice-${notice.id}`))
  ), [dismissedNotificationKeys, publicationNotices]);
  const clientNotifications = useMemo(() => {
    const notifications = adminData.supplierClientNotifications || [];
    return notifications.filter((notification) => (
      notification.type !== 'Demande'
      && isClientNotificationForSupplier(notification, user, supplierProfile)
    ));
  }, [adminData.supplierClientNotifications, supplierProfile, user]);
  const visibleClientNotifications = useMemo(() => (
    clientNotifications.filter((notification) => !dismissedNotificationKeys.includes(`supplier-client-${notification.id}`))
  ), [clientNotifications, dismissedNotificationKeys]);
  const demandNotifications = useMemo(() => (
    (adminData.supplierClientNotifications || [])
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => isClientNotificationForSupplier(notification, user, supplierProfile))
      .map((notification) => ({
        ...notification,
        lastMessage: getLastDemandMessage(notification),
      }))
      .filter((notification) => notification.lastMessage?.senderRole === 'user')
      .sort((a, b) => new Date(b.lastMessage.createdAt || b.updatedAt || 0) - new Date(a.lastMessage.createdAt || a.updatedAt || 0))
  ), [adminData.supplierClientNotifications, supplierProfile, user]);
  const visibleDemandNotifications = useMemo(() => (
    demandNotifications.filter((notification) => (
      !dismissedNotificationKeys.includes(`supplier-demand-${notification.id}-${notification.lastMessage.id}`)
    ))
  ), [demandNotifications, dismissedNotificationKeys]);
  const visibleSupportReplies = useMemo(() => (
    supportItems
      .filter((item) => item.reply && !dismissedNotificationKeys.includes(`supplier-support-reply-${item.id}`))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
  ), [dismissedNotificationKeys, supportItems]);

  const sidebarSections = useMemo(
    () => [
      {
        title: supplierText.sidebar.section,
        items: [
          {
            id: 'supplier-dashboard',
            label: supplierText.sidebar.dashboard,
            path: '/supplier/dashboard',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'supplier-shop',
            label: supplierText.sidebar.shop,
            path: '/supplier/shop',
            icon: <Icon name="Workspaces" />,
          },
          {
            id: 'supplier-products',
            label: supplierText.sidebar.products,
            path: '/supplier/products',
            icon: <Icon name="ReceiptLong" />,
          },
          {
            id: 'supplier-clients',
            label: supplierText.sidebar.clients,
            path: '/supplier/clients',
            icon: <Icon name="Visibility" />,
          },
          {
            id: 'supplier-demande',
            label: supplierText.sidebar.demande,
            path: '/supplier/demande',
            icon: <Icon name="Storefront" />,
          },
          {
            id: 'supplier-content',
            label: supplierText.sidebar.content,
            icon: <Icon name="Folder" />,
            defaultOpen: true,
            children: [
              {
                id: 'supplier-files',
                label: supplierText.sidebar.files,
                path: '/supplier/content/files',
              },
            ],
          },
          {
            id: 'supplier-support',
            label: supplierText.sidebar.support,
            path: '/supplier/support',
            icon: <Icon name="Chat" />,
          },
          {
            id: 'supplier-settings',
            label: supplierText.sidebar.settings,
            path: '/supplier/settings',
            icon: <Icon name="Info" />,
          },
          {
            id: 'logout',
            label: supplierText.sidebar.logout,
            path: '/deconnexion',
            icon: <Icon name="Logout" />,
          },
        ],
      },
    ],
    [supplierText],
  );

  const currentPage = supplierText.pageTitles[location.pathname] || supplierText.pageTitles.fallback;
  const searchValue = searchParams.get('q') || '';
  const searchIcon = SUPPLIER_SEARCH_ICONS[location.pathname] || 'Search';

  function handleSearchChange(value) {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleSearchSubmit(payload = {}) {
    const query = payload.query ?? searchValue.trim();
    const indexedCount = Array.isArray(payload.matches) ? payload.matches.length : 0;
    const suffix = query ? ` · ${indexedCount} résultat(s) indexé(s)` : '';
    setSearchMessage(`${supplierText.search.message(query)}${suffix}`);
  }

  function handleLogout() {
    setIsAccountOpen(false);
    navigate('/deconnexion');
  }

  function dismissVisibleNotifications() {
    const nextKeys = [
      ...dismissedNotificationKeys,
      ...visiblePublicationNotices.map((notice) => `supplier-notice-${notice.id}`),
      ...visibleClientNotifications.map((notification) => `supplier-client-${notification.id}`),
      ...visibleDemandNotifications.map((notification) => `supplier-demand-${notification.id}-${notification.lastMessage.id}`),
      ...visibleSupportReplies.map((item) => `supplier-support-reply-${item.id}`),
    ];
    const uniqueKeys = [...new Set(nextKeys)];
    setDismissedNotificationKeys(uniqueKeys);
    window.localStorage.setItem(SUPPLIER_DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(uniqueKeys));
    setIsNotificationsOpen(false);
  }

  return (
    <main
      className={[
        'dashboard-shell',
        'supplier-shell',
        isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
        isThemeDark ? 'is-theme-dark' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Sidebar
        logo={<Logo variant="sidebar" />}
        variant="supplier"
        sections={sidebarSections}
        isOpen={!isSidebarCollapsed}
        onClose={() => setIsSidebarCollapsed(true)}
        user={{
          initials: getUserInitials(user),
          name: getDisplayName(user),
          email: user?.email || '',
          avatarColor: getAvatarColor(user),
        }}
      />

      <section className="dashboard-content supplier-shell__content">
        <Header
          currentPage={currentPage}
          isAccountOpen={isAccountOpen}
          isNotificationsOpen={isNotificationsOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          isThemeDark={isThemeDark}
          searchValue={searchValue}
          searchIcon={searchIcon}
          searchPlaceholder={supplierText.search.placeholder(currentPage)}
          notificationCount={visiblePublicationNotices.length + visibleClientNotifications.length + visibleDemandNotifications.length + visibleSupportReplies.length}
          onAccountClick={() => {
            setIsAccountOpen((open) => !open);
            setIsNotificationsOpen(false);
          }}
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          onNotificationsClick={() => {
            setIsNotificationsOpen((open) => !open);
            setIsAccountOpen(false);
          }}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onThemeToggle={() => setIsThemeDark((dark) => !dark)}
        />

        {isNotificationsOpen && (
          <div className="dashboard-floating-panel notification-panel">
            <div className="notification-panel__header">
              <strong>{supplierText.notifications.title}</strong>
              <button type="button" aria-label={supplierText.notifications.closeAll} onClick={dismissVisibleNotifications}>
                <Icon name="Close" size="sm" />
              </button>
            </div>
            {visiblePublicationNotices.length === 0 && visibleClientNotifications.length === 0 && visibleDemandNotifications.length === 0 && visibleSupportReplies.length === 0 ? (
              <span>{supplierText.notifications.empty}</span>
            ) : (
              <div className="notification-panel__list">
                {visibleDemandNotifications.map((notification) => (
                  <button
                    key={`${notification.id}-${notification.lastMessage.id}`}
                    type="button"
                    className="notification-panel__item"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/supplier/demande');
                    }}
                  >
                    <Icon name="Storefront" size="sm" />
                    <span>
                      Demande client : <b>{notification.clientName || 'Client ArchiPrice'}</b>
                      <small>{notification.lastMessage.message}</small>
                    </span>
                  </button>
                ))}
                {visibleSupportReplies.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="notification-panel__item"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/supplier/support');
                    }}
                  >
                    <Icon name="Chat" size="sm" />
                    <span>
                      Réponse admin : <b>{item.subject}</b>
                      <small>{item.reply}</small>
                    </span>
                  </button>
                ))}
                {visibleClientNotifications.map((notification) => (
                  <div key={notification.id} className="notification-panel__item">
                    <Icon name="Visibility" size="sm" />
                    <span>
                      Nouveau client : <b>{notification.clientName}</b>
                      <small>
                        {notification.projectName} · {notification.simulationTotalLabel || 'Simulation non renseignée'}
                      </small>
                    </span>
                  </div>
                ))}
                {visiblePublicationNotices.map((notice) => (
                  <div key={notice.id} className="notification-panel__item">
                    <Icon name="Info" size="sm" />
                    <span>
                      {supplierText.notifications.refused} : <b>{notice.productName}</b>
                      <small>{notice.reason}</small>
                    </span>
                  </div>
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
