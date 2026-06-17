export const ADMIN_LANGUAGE_LABELS = {
  fr: 'Français',
  en: 'Anglais',
};

export const ADMIN_TRANSLATIONS = {
  fr: {
    pageTitles: {
      '/admin/dashboard': 'Tableau de bord admin',
      '/admin/catalogue/products': 'Articles',
      '/admin/suppliers': 'Fournisseurs',
      '/admin/users': 'Administration utilisateurs',
      '/admin/simulations': 'Simulations',
      '/admin/support': 'Support',
      '/admin/settings': 'Paramètres',
      fallback: 'Administration',
    },
    sidebar: {
      section: 'Administration',
      dashboard: 'Tableau de bord',
      articles: 'Articles',
      suppliers: 'Fournisseurs',
      suppliersList: 'Liste fournisseurs',
      users: 'Utilisateurs',
      simulations: 'Simulations',
      support: 'Support',
      settings: 'Paramètres',
      logout: 'Déconnexion',
    },
    search: {
      placeholder: (page) => `Rechercher dans ${page.toLowerCase()}`,
      message: (query) => (query ? `Recherche admin : ${query}` : 'Saisissez un mot-clé pour rechercher.'),
    },
    notifications: {
      title: 'Notifications admin',
      close: 'Fermer les notifications',
      empty: 'Aucune nouvelle notification backoffice.',
      publication: 'Publication fournisseur',
      newUser: 'Nouvelle inscription user',
      newFeedback: (role) => `Nouveau feedback ${role === 'supplier' ? 'fournisseur' : 'user'}`,
    },
    settings: {
      title: 'Paramètres',
      section: 'Général',
      locations: 'Emplacements',
      timezone: 'Fuseau horaire',
      language: 'Langue',
      policy: 'Politique',
      policyDescription: 'CGU, confidentialité, conditions fournisseurs et mentions légales.',
    },
  },
  en: {
    pageTitles: {
      '/admin/dashboard': 'Admin dashboard',
      '/admin/catalogue/products': 'Articles',
      '/admin/suppliers': 'Suppliers',
      '/admin/users': 'User management',
      '/admin/simulations': 'Simulations',
      '/admin/support': 'Support',
      '/admin/settings': 'Settings',
      fallback: 'Administration',
    },
    sidebar: {
      section: 'Administration',
      dashboard: 'Dashboard',
      articles: 'Articles',
      suppliers: 'Suppliers',
      suppliersList: 'Supplier list',
      users: 'Users',
      simulations: 'Simulations',
      support: 'Support',
      settings: 'Settings',
      logout: 'Logout',
    },
    search: {
      placeholder: (page) => `Search in ${page.toLowerCase()}`,
      message: (query) => (query ? `Admin search: ${query}` : 'Enter a keyword to search.'),
    },
    notifications: {
      title: 'Admin notifications',
      close: 'Close notifications',
      empty: 'No new backoffice notification.',
      publication: 'Supplier publication',
      newUser: 'New user signup',
      newFeedback: (role) => `New ${role === 'supplier' ? 'supplier' : 'user'} feedback`,
    },
    settings: {
      title: 'Settings',
      section: 'General',
      locations: 'Locations',
      timezone: 'Time zone',
      language: 'Language',
      policy: 'Policy',
      policyDescription: 'Terms, privacy, supplier conditions and legal notices.',
    },
  },
};

export function normalizeAdminLanguage(language) {
  return String(language || '').toLowerCase().startsWith('ang') || String(language || '').toLowerCase().startsWith('en')
    ? 'en'
    : 'fr';
}

export function getAdminLanguage(adminData) {
  return normalizeAdminLanguage(adminData?.adminSettings?.settings?.language);
}

export function getAdminTranslations(adminDataOrLanguage) {
  const language = typeof adminDataOrLanguage === 'string'
    ? normalizeAdminLanguage(adminDataOrLanguage)
    : getAdminLanguage(adminDataOrLanguage);

  return ADMIN_TRANSLATIONS[language] || ADMIN_TRANSLATIONS.fr;
}
