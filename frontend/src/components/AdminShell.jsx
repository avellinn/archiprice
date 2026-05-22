import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Icon from './Icon';
import Sidebar from './Sidebar';
import useAuth from '../context/useAuth';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';

const ADMIN_PAGE_TITLES = {
  '/admin/dashboard': 'Tableau de bord admin',
  '/admin/catalogue/products': 'Produits',
  '/admin/catalogue/filters': 'Catégories & filtres',
  '/admin/suppliers': 'Fournisseurs',
  '/admin/users': 'Administration utilisateurs',
  '/admin/simulations': 'Simulations',
  '/admin/support': 'Support',
  '/admin/settings': 'Paramètres',
};

export default function AdminShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

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
                label: 'Produits',
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
            path: '/admin/suppliers',
            icon: <Icon name="Workspaces" />,
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
            action: true,
            icon: <Icon name="Logout" />,
          },
        ],
      },
    ],
    [],
  );

  function handleSearchSubmit() {
    const query = searchValue.trim();
    setSearchMessage(query ? `Recherche admin : ${query}` : 'Saisissez un mot-clé pour rechercher.');
  }

  function handleLogout() {
    setIsAccountOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  const currentPage = ADMIN_PAGE_TITLES[location.pathname] || 'Administration';

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
        onItemClick={(itemId) => {
          if (itemId === 'logout') handleLogout();
        }}
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
          onSearchChange={setSearchValue}
          onSearchSubmit={handleSearchSubmit}
          onThemeToggle={() => setIsThemeDark((dark) => !dark)}
        />

        {isNotificationsOpen && (
          <div className="dashboard-floating-panel notification-panel">
            <strong>Notifications admin</strong>
            <span>Aucune nouvelle notification backoffice.</span>
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
