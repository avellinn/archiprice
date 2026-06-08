export const USER_LANGUAGE_LABELS = {
  fr: 'Français (France)',
  en: 'English (US)',
};

export const USER_TRANSLATIONS = {
  fr: {
    pageTitles: {
      '/dashboard': 'Tableau de bord',
      '/catalogue': 'Explorer catalogue',
      '/workspace': 'Mon espace de travail',
      '/demande': 'Demande',
      '/archives': 'Archives',
      '/support': 'Support',
      '/parametres': 'Paramètres',
      '/deconnexion': 'Déconnexion',
      fallback: 'Tableau de bord',
    },
    searchPlaceholders: {
      '/dashboard': 'Rechercher un projet récent',
      '/catalogue': 'Rechercher un article, une boutique...',
      '/workspace': 'Rechercher un projet',
      '/demande': 'Rechercher une demande',
      '/archives': 'Rechercher une archive',
      '/support': 'Rechercher une demande support',
      '/parametres': 'Rechercher un paramètre',
    },
    sidebar: {
      section: 'Navigation',
      dashboard: 'Tableau de bord',
      catalogue: 'Explorer catalogue',
      workspace: 'Mon espace de travail',
      demande: 'Demande',
      archives: 'Archives',
      support: 'Support',
      settings: 'Paramètres',
      logout: 'Déconnexion',
    },
    search: {
      message: (query) => (query ? `Recherche lancée : ${query}` : 'Saisissez un mot-clé pour rechercher.'),
    },
    notifications: {
      title: 'Notifications',
      close: 'Fermer',
      empty: 'Aucune nouvelle notification pour le moment.',
    },
    profile: {
      title: 'Votre profil',
      photo: 'Photo de profil',
      deletePhoto: 'Supprimer la photo',
      editPhoto: 'Modifier la photo',
      name: 'Nom',
      email: 'Adresse e-mail',
      useCase: 'Dans quel cadre allez-vous utiliser ArchiPrice ?',
      language: 'Langue',
      socialTitle: 'Comptes de réseaux sociaux associés',
      socialDescription: 'Services que vous utilisez pour vous connecter à ArchiPrice',
      disconnected: 'Compte non connecté',
      googleDisconnect: 'Déconnexion Google',
      googleConnect: 'Connexion Google',
      accountLogout: 'Se déconnecter du compte',
    },
  },
  en: {
    pageTitles: {
      '/dashboard': 'Dashboard',
      '/catalogue': 'Explore catalogue',
      '/workspace': 'My workspace',
      '/demande': 'Request',
      '/archives': 'Archives',
      '/support': 'Support',
      '/parametres': 'Settings',
      '/deconnexion': 'Logout',
      fallback: 'Dashboard',
    },
    searchPlaceholders: {
      '/dashboard': 'Search recent projects',
      '/catalogue': 'Search an item, a shop...',
      '/workspace': 'Search a project',
      '/demande': 'Search a request',
      '/archives': 'Search an archive',
      '/support': 'Search a support request',
      '/parametres': 'Search a setting',
    },
    sidebar: {
      section: 'Navigation',
      dashboard: 'Dashboard',
      catalogue: 'Explore catalogue',
      workspace: 'My workspace',
      demande: 'Request',
      archives: 'Archives',
      support: 'Support',
      settings: 'Settings',
      logout: 'Logout',
    },
    search: {
      message: (query) => (query ? `Search started: ${query}` : 'Enter a keyword to search.'),
    },
    notifications: {
      title: 'Notifications',
      close: 'Close',
      empty: 'No new notification for now.',
    },
    profile: {
      title: 'Your profile',
      photo: 'Profile photo',
      deletePhoto: 'Remove photo',
      editPhoto: 'Change photo',
      name: 'Name',
      email: 'Email address',
      useCase: 'How will you use ArchiPrice?',
      language: 'Language',
      socialTitle: 'Connected social accounts',
      socialDescription: 'Services you use to sign in to ArchiPrice',
      disconnected: 'Account not connected',
      googleDisconnect: 'Disconnect Google',
      googleConnect: 'Connect Google',
      accountLogout: 'Sign out of account',
    },
  },
};

export function normalizeUserLanguage(language) {
  return String(language || '').toLowerCase().startsWith('eng')
    || String(language || '').toLowerCase().startsWith('en')
    ? 'en'
    : 'fr';
}

export function getUserTranslations(language) {
  const normalizedLanguage = normalizeUserLanguage(language);
  return USER_TRANSLATIONS[normalizedLanguage] || USER_TRANSLATIONS.fr;
}
