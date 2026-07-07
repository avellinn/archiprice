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
      password: 'Mot de passe',
      passwordDescription: 'Modifier le mot de passe de connexion',
      editPassword: 'Modifier le mot de passe',
      policy: 'Politique',
      policyDescription: "Consulter les politiques synchronisées par l'administration",
      editEyebrow: 'Profil',
      editTitle: (label) => `Modifier ${String(label || '').toLowerCase()}`,
      profileUpdated: 'Profil mis à jour.',
      profileUpdateError: 'Impossible de mettre à jour le profil.',
      passwordUpdated: 'Mot de passe mis à jour.',
      policiesViewed: 'Politiques consultées.',
    },
    support: {
      eyebrow: 'Assistance', title: 'Support', leaveComment: 'Laisser un commentaire',
      listTitle: 'Mes feedbacks', empty: 'Aucun feedback envoyé pour le moment.',
      placeholder: 'Partagez votre feedback sur votre expérience ArchiPrice.',
      adminReply: 'Réponse admin', delete: 'Supprimer de ma liste',
      sent: 'Merci pour votre feedback', replySent: 'Réponse envoyée.',
    },
    common: {
      close: 'Fermer',
      cancel: 'Annuler',
      send: 'Envoyer',
      save: 'Sauvegarder',
      saving: 'Sauvegarde...',
      message: 'Message',
      you: 'Vous',
      passwordModal: {
        eyebrow: 'Sécurité',
        title: 'Modifier le mot de passe',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le nouveau mot de passe',
        mismatch: 'Les nouveaux mots de passe ne correspondent pas.',
        saved: 'Mot de passe sauvegardé.',
        saveError: 'Impossible de modifier le mot de passe.',
      },
    },
    demand: {
      eyebrow: 'Conversations boutique', title: 'Mes demandes boutique', loading: 'Chargement des conversations...',
      empty: 'Cliquez sur une boutique depuis « Où acheter » pour démarrer une demande.',
      newMessage: 'Nouveau message', readLabel: 'Message lu', noProject: 'Projet non renseigné', noMessage: 'Aucun message renseigné',
      noConversationMessage: 'Aucun message dans cette conversation.', placeholder: 'Écrivez votre message…',
      badgeNewMessages: (count) => `${count} nouveau${count > 1 ? 'x' : ''} message${count > 1 ? 's' : ''}`,
      messageSent: 'Message envoyé.',
      conversationHidden: 'Conversation supprimée de votre liste.',
      deleteTitle: 'Supprimer de ma liste',
    },
    archives: {
      title: 'Archives',
      emptyTitle: 'Aucune archive disponible',
      emptyDescription: 'Les archives créées après confirmation de validation apparaîtront ici.',
      deleted: 'Archive supprimée définitivement.',
      deleteConfirmTitle: 'Supprimer définitivement',
      deleteConfirmBody: 'Cette action retirera l’archive de votre liste.',
      cancel: 'Annuler',
      confirm: 'Valider',
      articles: (count) => `${count} article(s)`,
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
      password: 'Password',
      passwordDescription: 'Change the sign-in password',
      editPassword: 'Change password',
      policy: 'Policy',
      policyDescription: 'Review policies synchronized by administration',
      editEyebrow: 'Profile',
      editTitle: (label) => `Edit ${String(label || '').toLowerCase()}`,
      profileUpdated: 'Profile updated.',
      profileUpdateError: 'Unable to update profile.',
      passwordUpdated: 'Password updated.',
      policiesViewed: 'Policies reviewed.',
    },
    support: {
      eyebrow: 'Help', title: 'Support', leaveComment: 'Leave a comment',
      listTitle: 'My feedback', empty: 'No feedback sent yet.',
      placeholder: 'Share feedback about your ArchiPrice experience.',
      adminReply: 'Admin reply', delete: 'Remove from my list',
      sent: 'Thank you for your feedback', replySent: 'Reply sent.',
    },
    common: {
      close: 'Close',
      cancel: 'Cancel',
      send: 'Send',
      save: 'Save',
      saving: 'Saving...',
      message: 'Message',
      you: 'You',
      passwordModal: {
        eyebrow: 'Security',
        title: 'Change password',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm new password',
        mismatch: 'The new passwords do not match.',
        saved: 'Password saved.',
        saveError: 'Unable to change password.',
      },
    },
    demand: {
      eyebrow: 'Shop conversations', title: 'My shop requests', loading: 'Loading conversations...',
      empty: 'Select a shop from “Where to buy” to start a request.',
      newMessage: 'New message', readLabel: 'Message read', noProject: 'Project not specified', noMessage: 'No message',
      noConversationMessage: 'No messages in this conversation.', placeholder: 'Write your message…',
      badgeNewMessages: (count) => `${count} new message${count > 1 ? 's' : ''}`,
      messageSent: 'Message sent.',
      conversationHidden: 'Conversation removed from your list.',
      deleteTitle: 'Remove from my list',
    },
    archives: {
      title: 'Archives',
      emptyTitle: 'No archive available',
      emptyDescription: 'Archives created after validation confirmation will appear here.',
      deleted: 'Archive permanently deleted.',
      deleteConfirmTitle: 'Delete permanently',
      deleteConfirmBody: 'This action will remove the archive from your list.',
      cancel: 'Cancel',
      confirm: 'Confirm',
      articles: (count) => `${count} item(s)`,
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

export function getStoredUserLanguage() {
  if (typeof window === 'undefined') return 'fr';
  try {
    const profile = JSON.parse(window.localStorage.getItem('archiprice_user_profile_preferences') || '{}');
    return normalizeUserLanguage(profile.language);
  } catch {
    return 'fr';
  }
}
