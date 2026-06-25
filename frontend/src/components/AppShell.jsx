import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Icon from './Icon';
import Logo from './Logo';
import Sidebar from './Sidebar';
import useAuth from '../context/useAuth';
import { syncAdminDataFromRemote, useAdminData } from '../services/adminData';
import { fetchMyDemandes, subscribeDemandesChange } from '../services/demandes';
import { connectRealtime } from '../services/realtime';
import { fetchMySupportItems, subscribeSupportChange } from '../services/support';
import { getUserTranslations, normalizeUserLanguage } from '../utils/userLanguage';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import { useWorkspaceLanguage } from '../utils/workspaceLanguage';

const USER_PROFILE_KEY = 'archiprice_user_profile_preferences';
const THEME_STORAGE_KEY = 'archiprice:theme';
const USER_PROFILE_EVENT = 'archiprice:user-profile-change';
const USER_DISMISSED_NOTIFICATIONS_KEY = 'archiprice:user-dismissed-notifications';
const NOTIFICATIONS_READ_EVENT = 'archiprice:notifications-read-change';
const USER_SEARCH_ICONS = {
  '/dashboard': 'Dashboard',
  '/catalogue': 'Explore',
  '/workspace': 'Workspaces',
  '/demande': 'Storefront',
  '/archives': 'ReceiptLong',
  '/support': 'Chat',
  '/parametres': 'AccountCircle',
  '/deconnexion': 'Logout',
};

function readUserLanguage() {
  try {
    const profile = JSON.parse(window.localStorage.getItem(USER_PROFILE_KEY) || '{}');
    return normalizeUserLanguage(profile.language);
  } catch {
    return 'fr';
  }
}

function readThemePreference() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
}

function readDismissedNotificationKeys() {
  try {
    return JSON.parse(window.localStorage.getItem(USER_DISMISSED_NOTIFICATIONS_KEY) || '[]');
  } catch {
    return [];
  }
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

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(readThemePreference);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [userLanguage, setUserLanguage] = useState(readUserLanguage);
  const [supportItems, setSupportItems] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState(readDismissedNotificationKeys);
  const [adminData] = useAdminData();
  const userText = getUserTranslations(userLanguage);
  useWorkspaceLanguage(userLanguage);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', isThemeDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, isThemeDark ? 'dark' : 'light');
  }, [isThemeDark]);

  useEffect(() => {
    const syncTheme = (event) => {
      if (event.key && event.key !== THEME_STORAGE_KEY) return;
      setIsThemeDark(readThemePreference());
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const refreshSupportNotifications = useCallback(async () => {
    try {
      setSupportItems(await fetchMySupportItems());
    } catch {
      setSupportItems([]);
    }
  }, []);

  const refreshDemandeNotifications = useCallback(async () => {
    try {
      setDemandes(await fetchMyDemandes());
    } catch {
      setDemandes([]);
    }
  }, []);

  useEffect(() => {
    function handleProfileChange(event) {
      if (event.type === 'storage' && event.key !== USER_PROFILE_KEY) return;
      setUserLanguage(readUserLanguage());
    }

    window.addEventListener(USER_PROFILE_EVENT, handleProfileChange);
    window.addEventListener('storage', handleProfileChange);

    return () => {
      window.removeEventListener(USER_PROFILE_EVENT, handleProfileChange);
      window.removeEventListener('storage', handleProfileChange);
    };
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      refreshSupportNotifications();
      refreshDemandeNotifications();
    }, 0);
    return () => {
      window.clearTimeout(refreshTimer);
    };
  }, [refreshDemandeNotifications, refreshSupportNotifications, location.pathname]);

  useEffect(() => connectRealtime({
    onEvent: (event) => {
      if (event?.type === 'connected') return;
      syncAdminDataFromRemote().catch(() => {});
      refreshSupportNotifications();
      refreshDemandeNotifications();
    },
  }), [refreshDemandeNotifications, refreshSupportNotifications]);

  useEffect(() => subscribeDemandesChange(refreshDemandeNotifications), [refreshDemandeNotifications]);
  useEffect(() => subscribeSupportChange(refreshSupportNotifications), [refreshSupportNotifications]);

  useEffect(() => {
    function handleDismissedNotificationsChange(event) {
      if (event.type === 'storage' && event.key !== USER_DISMISSED_NOTIFICATIONS_KEY) return;
      setDismissedNotificationKeys(readDismissedNotificationKeys());
    }

    window.addEventListener('storage', handleDismissedNotificationsChange);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, handleDismissedNotificationsChange);

    return () => {
      window.removeEventListener('storage', handleDismissedNotificationsChange);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, handleDismissedNotificationsChange);
    };
  }, []);

  const sidebarSections = useMemo(
    () => [
      {
        title: userText.sidebar.section,
        items: [
          {
            id: 'dashboard',
            label: userText.sidebar.dashboard,
            path: '/dashboard',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'explorer-catalogue',
            label: userText.sidebar.catalogue,
            path: '/catalogue',
            icon: <Icon name="Explore" />,
          },
          {
            id: 'workspace',
            label: userText.sidebar.workspace,
            path: '/workspace',
            icon: <Icon name="Workspaces" />,
          },
          {
            id: 'demande',
            label: userText.sidebar.demande,
            path: '/demande',
            icon: <Icon name="Storefront" />,
          },
          {
            id: 'archives',
            label: userText.sidebar.archives,
            path: '/archives',
            icon: <Icon name="ReceiptLong" />,
          },
          {
            id: 'support',
            label: userText.sidebar.support,
            path: '/support',
            icon: <Icon name="Chat" />,
          },
          {
            id: 'parametres',
            label: userText.sidebar.settings,
            path: '/parametres',
            icon: <Icon name="Info" />,
          },
          {
            id: 'logout',
            label: userText.sidebar.logout,
            path: '/deconnexion',
            icon: <Icon name="Logout" />,
          },
        ],
      },
    ],
    [userText],
  );

  function handleSearchSubmit(payload = {}) {
    const query = payload.query ?? searchValue.trim();
    const indexedCount = Array.isArray(payload.matches) ? payload.matches.length : 0;
    const suffix = query ? ` · ${indexedCount} résultat(s) indexé(s)` : '';
    setSearchMessage(`${userText.search.message(query)}${suffix}`);
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

  function handleLogout() {
    setIsAccountOpen(false);
    navigate('/deconnexion');
  }

  const replyNotifications = useMemo(() => (
    supportItems
      .filter((item) => (
        (item.unreadForOwner === undefined ? Boolean(item.reply) : Number(item.unreadForOwner) > 0)
        && !dismissedNotificationKeys.includes(`support-reply-${item.id}`)
      ))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
  ), [dismissedNotificationKeys, supportItems]);
  const demandReplyNotifications = useMemo(() => {
    const userEmail = user?.email || '';
    const userId = user?.id || user?._id || '';

    const sourceDemandes = demandes.length > 0 ? demandes : (adminData.supplierClientNotifications || []);

    return sourceDemandes
      .filter((notification) => notification.type === 'Demande')
      .filter((notification) => (
        userId
          ? notification.clientId === userId
          : notification.clientEmail === userEmail
      ))
      .map((notification) => ({
        ...notification,
        lastMessage: getLastDemandMessage(notification),
      }))
      .filter((notification) => (
        notification.unreadForUser === undefined || Number(notification.unreadForUser) > 0
      ))
      .filter((notification) => notification.lastMessage?.senderRole === 'supplier')
      .filter((notification) => !dismissedNotificationKeys.includes(`demand-reply-${notification.id}-${notification.lastMessage.id}`))
      .sort((a, b) => new Date(b.lastMessage.createdAt || b.updatedAt || 0) - new Date(a.lastMessage.createdAt || a.updatedAt || 0));
  }, [adminData.supplierClientNotifications, demandes, dismissedNotificationKeys, user]);
  const sidebarSectionsWithBadges = useMemo(() => (
    sidebarSections.map((section) => ({
      ...section,
      items: section.items.map((item) => (
        item.id === 'demande'
          ? { ...item, badge: demandReplyNotifications.length || undefined }
          : item.id === 'support'
            ? { ...item, badge: replyNotifications.length || undefined }
            : item
      )),
    }))
  ), [demandReplyNotifications.length, replyNotifications.length, sidebarSections]);

  function dismissVisibleNotifications() {
    const nextKeys = [
      ...dismissedNotificationKeys,
      ...replyNotifications.map((item) => `support-reply-${item.id}`),
      ...demandReplyNotifications.map((item) => `demand-reply-${item.id}-${item.lastMessage.id}`),
    ];
    const uniqueKeys = [...new Set(nextKeys)];
    setDismissedNotificationKeys(uniqueKeys);
    window.localStorage.setItem(USER_DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(uniqueKeys));
    setIsNotificationsOpen(false);
  }

  const currentPage = userText.pageTitles[location.pathname] || userText.pageTitles.fallback;
  const searchValue = searchParams.get('q') || '';
  const searchIcon = USER_SEARCH_ICONS[location.pathname] || 'Search';
  const searchPlaceholder = userText.searchPlaceholders[location.pathname] || `Rechercher dans ${currentPage.toLowerCase()}`;

  return (
    <main
      className={[
        'dashboard-shell',
        isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
        isThemeDark ? 'is-theme-dark' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Sidebar
        logo={<Logo variant="sidebar" />}
        logoTo="/dashboard"
        logoLabel="Aller au dashboard"
        sections={sidebarSectionsWithBadges}
        isOpen={!isSidebarCollapsed}
        onClose={() => setIsSidebarCollapsed(true)}
        user={{
          initials: getUserInitials(user),
          name: getDisplayName(user),
          email: user?.email || '',
          avatarColor: getAvatarColor(user),
        }}
      />

      <section className="dashboard-content">
        <Header
          currentPage={currentPage}
          isAccountOpen={isAccountOpen}
          isNotificationsOpen={isNotificationsOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          isThemeDark={isThemeDark}
          searchValue={searchValue}
          searchIcon={searchIcon}
          searchPlaceholder={searchPlaceholder}
          notificationCount={replyNotifications.length + demandReplyNotifications.length}
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
              <strong>{userText.notifications.title}</strong>
              <button type="button" aria-label={userText.notifications.close} onClick={dismissVisibleNotifications}>
                <Icon name="Close" size="sm" />
              </button>
            </div>
            {replyNotifications.length === 0 && demandReplyNotifications.length === 0 ? (
              <span>{userText.notifications.empty}</span>
            ) : (
              <div className="notification-panel__list">
                {demandReplyNotifications.map((item) => (
                  <button
                    key={`${item.id}-${item.lastMessage.id}`}
                    type="button"
                    className="notification-panel__item"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/demande');
                    }}
                  >
                    <Icon name="Storefront" size="sm" />
                    <span>
                      Réponse boutique : <b>{item.supplierName || 'Boutique'}</b>
                      <small>{item.lastMessage.message}</small>
                    </span>
                  </button>
                ))}
                {replyNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="notification-panel__item"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/support');
                    }}
                  >
                    <Icon name="Chat" size="sm" />
                    <span>
                      Réponse admin : <b>{item.subject}</b>
                      <small>{item.reply}</small>
                    </span>
                  </button>
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
