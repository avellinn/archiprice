import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { Icon } from './ui';
import useAuth from '../context/useAuth';
import { useAdminData } from '../services/adminData';
import { getAvatarColor, getDisplayName, getUserInitials } from '../utils/userDisplay';
import siteLogo from '../assets/images/log.png';

const SUPPLIER_PAGE_TITLES = {
  '/supplier/dashboard': 'Analyses de données',
  '/supplier/shop': 'Ma boutique',
  '/supplier/products': 'Produits',
  '/supplier/catalogue': 'Catalogue',
  '/supplier/clients': 'Clients',
  '/supplier/content/files': 'Fichiers',
  '/supplier/settings': 'Paramètres',
};

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

  const publicationNotices = useMemo(() => {
    const userIds = [user?.id, user?._id].filter(Boolean).map(String);
    const notices = adminData.supplierPublicationNotices || [];

    if (userIds.length === 0) return notices;

    return notices.filter((notice) => !notice.supplierUserId || userIds.includes(String(notice.supplierUserId)));
  }, [adminData.supplierPublicationNotices, user]);

  const sidebarSections = useMemo(
    () => [
      {
        title: 'Boutique',
        items: [
          {
            id: 'supplier-dashboard',
            label: 'Analyses de données',
            path: '/supplier/dashboard',
            icon: <Icon name="Dashboard" />,
          },
          {
            id: 'supplier-shop',
            label: 'Ma boutique',
            path: '/supplier/shop',
            icon: <Icon name="Workspaces" />,
          },
          {
            id: 'supplier-products',
            label: 'Produits',
            path: '/supplier/products',
            icon: <Icon name="ReceiptLong" />,
          },
          {
            id: 'supplier-catalogue',
            label: 'Catalogue',
            path: '/supplier/catalogue',
            icon: <Icon name="Explore" />,
          },
          {
            id: 'supplier-clients',
            label: 'Clients',
            path: '/supplier/clients',
            icon: <Icon name="Visibility" />,
          },
          {
            id: 'supplier-content',
            label: 'Contenu',
            icon: <Icon name="Folder" />,
            defaultOpen: true,
            children: [
              {
                id: 'supplier-files',
                label: 'Fichiers',
                path: '/supplier/content/files',
              },
            ],
          },
          {
            id: 'supplier-settings',
            label: 'Paramètres',
            path: '/supplier/settings',
            icon: <Icon name="Info" />,
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

  const currentPage = SUPPLIER_PAGE_TITLES[location.pathname] || 'Espace supplier';
  const searchValue = searchParams.get('q') || '';

  function handleSearchChange(value) {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleSearchSubmit() {
    const query = searchValue.trim();
    setSearchMessage(query ? `Recherche supplier : ${query}` : 'Saisissez un mot-clé pour rechercher.');
  }

  function handleLogout() {
    setIsAccountOpen(false);
    navigate('/deconnexion');
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
        logo={<img src={siteLogo} alt="ArchiPrice" />}
        title="Supplier"
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
          searchPlaceholder={`Rechercher dans ${currentPage.toLowerCase()}`}
          notificationCount={publicationNotices.length}
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
            <strong>Notifications supplier</strong>
            {publicationNotices.length === 0 ? (
              <span>Aucune nouvelle notification boutique.</span>
            ) : (
              <div className="notification-panel__list">
                {publicationNotices.map((notice) => (
                  <div key={notice.id} className="notification-panel__item">
                    <Icon name="Info" size="sm" />
                    <span>
                      Publication refusée : <b>{notice.productName}</b>
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
