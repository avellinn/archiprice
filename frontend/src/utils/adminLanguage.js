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
    support: {
      eyebrow: 'Assistance', title: 'Support', listTitle: 'Feedbacks reçus',
      empty: 'Aucun feedback reçu.', loading: 'Chargement des feedbacks...',
      deleted: 'Feedback supprimé.', replySent: 'Réponse envoyée.', updated: 'Feedback mis à jour.',
    },
    common: { close: 'Fermer', cancel: 'Annuler', send: 'Envoyer', message: 'Message', reply: 'Répondre' },
    users: {
      statusActive: 'Actif',
      statusInactive: 'Inactif',
      statusBlocked: 'Bloqué',
      statusMissing: 'Inexistant',
      permanentDelete: 'Supprimer définitivement',
      restore: 'Restaurer',
      delete: 'Supprimer',
    },
    suppliers: {
      statusMissing: 'Inexistant',
      permanentDelete: 'Supprimer définitivement',
      restore: 'Restaurer',
      delete: 'Supprimer',
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
    support: {
      eyebrow: 'Help desk', title: 'Support', listTitle: 'Received feedback',
      empty: 'No feedback received.', loading: 'Loading feedback...',
      deleted: 'Feedback deleted.', replySent: 'Reply sent.', updated: 'Feedback updated.',
    },
    common: { close: 'Close', cancel: 'Cancel', send: 'Send', message: 'Message', reply: 'Reply' },
    users: {
      statusActive: 'Active',
      statusInactive: 'Inactive',
      statusBlocked: 'Blocked',
      statusMissing: 'Missing',
      permanentDelete: 'Delete permanently',
      restore: 'Restore',
      delete: 'Delete',
    },
    suppliers: {
      statusMissing: 'Missing',
      permanentDelete: 'Delete permanently',
      restore: 'Restore',
      delete: 'Delete',
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
