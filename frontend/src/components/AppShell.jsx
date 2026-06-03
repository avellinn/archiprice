import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Icon from './Icon';
import Sidebar from './Sidebar';
import useAuth from '../context/useAuth';
import { syncAdminDataFromRemote } from '../services/adminData';
import { connectRealtime } from '../services/realtime';
import { getUserTranslations, normalizeUserLanguage } from '../utils/userLanguage';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';

const USER_PROFILE_KEY = 'archiprice_user_profile_preferences';
const USER_PROFILE_EVENT = 'archiprice:user-profile-change';
const USER_SEARCH_ICONS = {
  '/dashboard': 'Dashboard',
  '/catalogue': 'Explore',
  '/workspace': 'Workspaces',
  '/factures': 'ReceiptLong',
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

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [userLanguage, setUserLanguage] = useState(readUserLanguage);
  const userText = getUserTranslations(userLanguage);

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

  useEffect(() => connectRealtime({
    onEvent: (event) => {
      if (event?.type === 'connected') return;
      syncAdminDataFromRemote().catch(() => {});
    },
  }), []);

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
            id: 'invoices',
            label: userText.sidebar.invoices,
            path: '/factures',
            icon: <Icon name="ReceiptLong" />,
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
        logo={<img src={siteLogo} alt="ArchiPrice" />}
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
              <button type="button" aria-label={userText.notifications.close} onClick={() => setIsNotificationsOpen(false)}>
                <Icon name="Close" size="sm" />
              </button>
            </div>
            <span>{userText.notifications.empty}</span>
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
