import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Icon from './Icon';
import Sidebar from './Sidebar';
import useAuth from '../context/useAuth';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';

const PAGE_TITLES = {
  '/dashboard': 'Tableau de bord',
  '/catalogue': 'Explorer catalogue',
  '/workspace': 'Mon espace de travail',
  '/factures': 'Estimations exportées',
  '/deconnexion': 'Déconnexion',
};

const SEARCH_PLACEHOLDERS = {
  '/dashboard': 'Rechercher un projet récent',
  '/catalogue': 'Rechercher un article, une boutique...',
  '/workspace': 'Rechercher un projet',
  '/factures': 'Rechercher une estimation',
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const sidebarSections = useMemo(
    () => [
      {
        title: 'Navigation',
        items: [
          {
            id: 'dashboard',
            label: 'Tableau de bord',
            path: '/dashboard',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'explorer-catalogue',
            label: 'Explorer catalogue',
            path: '/catalogue',
            icon: <Icon name="Explore" />,
          },
          {
            id: 'workspace',
            label: 'Mon espace de travail',
            path: '/workspace',
            icon: <Icon name="Workspaces" />,
          },
          {
            id: 'invoices',
            label: 'Estimations exportées',
            path: '/factures',
            icon: <Icon name="ReceiptLong" />,
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
    [],
  );

  function handleSearchSubmit() {
    const query = searchValue.trim();
    setSearchMessage(query ? `Recherche lancée : ${query}` : 'Saisissez un mot-clé pour rechercher.');
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
    logout();
    navigate('/login', { replace: true });
  }

  const currentPage = PAGE_TITLES[location.pathname] || 'Tableau de bord';
  const searchValue = searchParams.get('q') || '';
  const searchPlaceholder = SEARCH_PLACEHOLDERS[location.pathname] || `Rechercher dans ${currentPage.toLowerCase()}`;

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
            <strong>Notifications</strong>
            <span>Aucune nouvelle notification pour le moment.</span>
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
