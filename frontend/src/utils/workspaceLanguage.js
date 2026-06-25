import { useEffect } from 'react';

const ENGLISH_UI = {
  'Tableau de bord': 'Dashboard',
  'Explorer catalogue': 'Explore catalogue',
  'Mon espace de travail': 'My workspace',
  'Ma boutique': 'My shop',
  'Paramètres': 'Settings',
  'Déconnexion': 'Logout',
  'Êtes-vous sûr de vouloir vous déconnecter ?': 'Are you sure you want to log out?',
  'Vous devrez vous reconnecter pour accéder à nouveau': 'You will need to sign in again to access your account.',
  'Se déconnecter': 'Logout',
  'Demande': 'Request',
  'Demandes': 'Requests',
  'Fichiers': 'Files',
  'Produits': 'Products',
  'Clients': 'Customers',
  'Archives': 'Archives',
  'Support': 'Support',
  'Navigation': 'Navigation',
  'Administration': 'Administration',
  'Utilisateurs': 'Users',
  'Fournisseurs': 'Suppliers',
  'Simulations': 'Simulations',
  'Articles': 'Items',
  'Articles catalogue': 'Catalogue items',
  'Articles actifs': 'Active items',
  'Articles publiés': 'Published items',
  'Total articles': 'Total items',
  'Projets en cours': 'Projects in progress',
  'Projets archives': 'Archived projects',
  'Projets traités': 'Processed projects',
  'Total projets': 'Total projects',
  'Activité récente': 'Recent activity',
  'Historique récent': 'Recent history',
  'Répartition': 'Breakdown',
  'Voir tout': 'View all',
  'Créer un projet': 'Create a project',
  'Nouveau projet': 'New project',
  'Ajouter': 'Add',
  'Ajouté': 'Added',
  'Modifier': 'Edit',
  'Supprimer': 'Delete',
  'Réinitialiser': 'Reset',
  'Annuler': 'Cancel',
  'Fermer': 'Close',
  'Enregistrer': 'Save',
  'Sauvegarder': 'Save',
  'Sauvegarde...': 'Saving...',
  'Publier': 'Publish',
  'Valider': 'Validate',
  'Confirmer la validation': 'Confirm validation',
  'Envoyer': 'Send',
  'Répondre': 'Reply',
  'Retour': 'Back',
  'Continuer': 'Continue',
  'Rechercher': 'Search',
  'Chargement...': 'Loading...',
  'Chargement du catalogue...': 'Loading catalogue...',
  'Aucun résultat': 'No results',
  'Aucune donnée disponible': 'No data available',
  'Aucun message': 'No message',
  'Aucune notification': 'No notifications',
  'Notifications': 'Notifications',
  'Nom': 'Name',
  'Titre': 'Title',
  'Description': 'Description',
  'Catégorie': 'Category',
  'Sous-catégorie': 'Subcategory',
  'Disponibilité': 'Availability',
  'Localisation': 'Location',
  'Ville': 'City',
  'Quartier': 'Neighborhood',
  'Langue': 'Language',
  'Fuseau horaire': 'Time zone',
  'Politique': 'Policy',
  'Mot de passe': 'Password',
  'Mot de passe actuel': 'Current password',
  'Nouveau mot de passe': 'New password',
  'Confirmer le nouveau mot de passe': 'Confirm new password',
  'Adresse e-mail': 'Email address',
  'Téléphone': 'Phone',
  'Prix': 'Price',
  'Prix HT': 'Price excl. tax',
  'Prix TTC': 'Price incl. tax',
  'Unité de vente': 'Sale unit',
  'Quantité': 'Quantity',
  'Budget': 'Budget',
  'Budget cible': 'Target budget',
  'Estimation min': 'Minimum estimate',
  'Estimation max': 'Maximum estimate',
  'Dépassement éventuel': 'Potential overrun',
  'Budget à définir': 'Budget required',
  'Aucune activité enregistrée pour le moment.': 'No activity recorded yet.',
  'Activité des demandes': 'Request activity',
  'Activités récentes': 'Recent activity',
  'Aucun': 'None',
  'Filtres': 'Filters',
  'Tout': 'All',
  'Toutes': 'All',
  'Tous': 'All',
  'Disponible': 'Available',
  'Indisponible': 'Unavailable',
  'Actif': 'Active',
  'Inactif': 'Inactive',
  'Brouillon': 'Draft',
  'En cours': 'In progress',
  'En attente': 'Pending',
  'Publié': 'Published',
  'Validé': 'Approved',
  'Refusé': 'Rejected',
  'Archivé': 'Archived',
  'Terminé': 'Completed',
  'Succès': 'Success',
  'Erreur': 'Error',
  'Aujourd’hui': 'Today',
  'Date': 'Date',
  'Projet': 'Project',
  'Projets': 'Projects',
  'Boutique': 'Shop',
  'Client': 'Customer',
  'Utilisateur': 'User',
  'Fournisseur': 'Supplier',
  'Conversation': 'Conversation',
  'Message': 'Message',
  'Vous': 'You',
  'Informations': 'Information',
  'Détails': 'Details',
  'Actions': 'Actions',
  'Images': 'Images',
  'Importer': 'Import',
  'Exporter en PDF': 'Export PDF',
  'Génération...': 'Generating...',
  'Format PDF': 'PDF format',
  'Récapitulatif': 'Summary',
  'Articles sélectionnés': 'Selected items',
  'Galerie produit': 'Product gallery',
  "Afficher l'image en plein écran": 'View image full screen',
  "Afficher l'image": 'Show image',
  'Image produit': 'Product image',
  'Image précédente': 'Previous image',
  'Image suivante': 'Next image',
  'Dimensions et tarif': 'Dimensions and pricing',
  'Organisation fournisseur': 'Supplier information',
  'Détails produit': 'Product details',
  'Longueur': 'Length',
  'Largeur': 'Width',
  'Épaisseur': 'Thickness',
  'Poids': 'Weight',
  'Gamme': 'Range',
  'Contactez la société': 'Contact the company',
  'Chargement de la fiche produit...': 'Loading product details...',
  'Article introuvable.': 'Product not found.',
  'Document exporté introuvable ou supprimé.': 'Exported document not found or deleted.',
  'Produits exportés': 'Exported products',
  'Produit': 'Product',
  'Sécurité': 'Security',
  'Modifier le mot de passe': 'Change password',
  'Mot de passe sauvegardé.': 'Password saved.',
  'Les nouveaux mots de passe ne correspondent pas.': 'New passwords do not match.',
  'Impossible de modifier le mot de passe.': 'Unable to change the password.',
  'Chargement des fichiers...': 'Loading files...',
  'Envoi vers Cloudinary...': 'Uploading to Cloudinary...',
  'Ajoutez vos produits': 'Add your products',
  'Commencez par ajouter à votre boutique des produits qui plairont à vos clients.': 'Start by adding products to your shop that will appeal to your customers.',
  'Ajouter un produit': 'Add a product',
  'Aucun catalogue créé pour le moment.': 'No catalogue created yet.',
  'Activité des projets': 'Project activity',
  'Projets récents': 'Recent projects',
  'Filtrer par date': 'Filter by date',
  'Tout': 'All',
  'Aucun projet enregistré pour le moment.': 'No project saved yet.',
  'Où acheter': 'Where to buy',
  'Afficher tous': 'Show all',
  'Nouveautés': 'New arrivals',
  'Général': 'General',
  'Emplacements': 'Locations',
  'Profil': 'Profile',
  'Compte': 'Account',
  'Sécurité': 'Security',
  'Mobilier': 'Furniture',
  'Revêtements de sol': 'Floor coverings',
  'Revêtements muraux': 'Wall coverings',
  'Peinture et finitions': 'Paint and finishes',
  'Éclairage': 'Lighting',
  'Sanitaire': 'Bathroom fixtures',
  'Cuisine': 'Kitchen',
  'Textiles et décoration': 'Textiles and decoration',
  'Portes et menuiseries': 'Doors and joinery',
  'Électricité': 'Electrical',
  'Plomberie': 'Plumbing',
  'Climatisation et ventilation': 'Air conditioning and ventilation',
  'Matériaux de construction': 'Building materials',
  'Aménagement extérieur': 'Outdoor design',
  'Accessoires et décoration': 'Accessories and decoration',
  'Canapés': 'Sofas',
  'Fauteuils': 'Armchairs',
  'Chaises': 'Chairs',
  'Tables': 'Tables',
  'Bureaux': 'Desks',
  'Meubles TV': 'TV units',
  'Bibliothèques': 'Bookcases',
  'Armoires': 'Wardrobes',
  'Commodes': 'Dressers',
  'Lits': 'Beds',
  'Matelas': 'Mattresses',
  'Mobilier extérieur': 'Outdoor furniture',
  'Carrelage': 'Tiles',
  'Parquet': 'Wood flooring',
  'Sol PVC': 'PVC flooring',
  'Moquette': 'Carpet',
  'Béton ciré': 'Polished concrete',
  'Papier peint': 'Wallpaper',
  'Panneaux décoratifs': 'Decorative panels',
  'Parement mural': 'Wall cladding',
  'Peinture intérieure': 'Interior paint',
  'Peinture extérieure': 'Exterior paint',
  'Vernis': 'Varnish',
  'Enduit': 'Plaster',
  'Suspensions': 'Pendant lights',
  'Lustres': 'Chandeliers',
  'Appliques murales': 'Wall lights',
  'Lampadaires': 'Floor lamps',
  'Lampes de table': 'Table lamps',
  'Rubans LED': 'LED strips',
  'Lavabos': 'Washbasins',
  'Douches': 'Showers',
  'Baignoires': 'Bathtubs',
  'Robinetterie': 'Faucets',
  'Éviers': 'Sinks',
  'Plans de travail': 'Worktops',
  'Électroménager': 'Appliances',
  'Rideaux': 'Curtains',
  'Tapis': 'Rugs',
  'Coussins': 'Cushions',
  'Portes intérieures': 'Interior doors',
  'Portes extérieures': 'Exterior doors',
  'Fenêtres': 'Windows',
  'Baies vitrées': 'Sliding glass doors',
  'Câbles': 'Cables',
  'Prises': 'Sockets',
  'Interrupteurs': 'Switches',
  'Tuyaux PVC': 'PVC pipes',
  'Raccords': 'Fittings',
  'Climatiseurs': 'Air conditioners',
  'Ventilateurs': 'Fans',
  'Ciment': 'Cement',
  'Sable': 'Sand',
  'Gravier': 'Gravel',
  'Briques': 'Bricks',
  'Parpaings': 'Concrete blocks',
  'Pavés': 'Pavers',
  'Gazon synthétique': 'Artificial grass',
  'Clôtures': 'Fences',
  'Pergolas': 'Pergolas',
  'Miroirs': 'Mirrors',
  'Tableaux': 'Wall art',
  'Objets décoratifs': 'Decorative objects',
  'Pièce': 'Piece',
  'Mètre': 'Meter',
  'Litre': 'Liter',
  'Rouleau': 'Roll',
  'Carton': 'Box',
  'Palette': 'Pallet',
  'Sac': 'Bag',
  'Tonne': 'Ton',
  'Barre': 'Bar',
  'Répondu': 'Answered',
};

const TEMPLATE_TRANSLATORS = [
  [/^(\d+) article\(s\) ajouté\(s\) au panier budget\.$/, '$1 item(s) added to the budget cart.'],
  [/^(\d+) article\(s\)$/, '$1 item(s)'],
  [/^Chargement des (.+)\.\.\.$/, 'Loading $1...'],
  [/^Aucun(?:e)? (.+) pour le moment\.$/, 'No $1 yet.'],
  [/^Supprimer (.+)$/, 'Delete $1'],
  [/^Rechercher dans (.+)$/, 'Search in $1'],
];

const ENGLISH_UI_NORMALIZED = new Map(
  Object.entries(ENGLISH_UI).map(([source, translation]) => [source.trim().toLocaleLowerCase('fr'), translation]),
);

const originalText = new WeakMap();
const translatedText = new WeakMap();
const originalAttributes = new WeakMap();
const TRANSLATED_ATTRIBUTES = ['placeholder', 'title', 'aria-label'];

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  return value.startsWith('en') || value.startsWith('ang') ? 'en' : 'fr';
}

export function translateWorkspaceText(value, language) {
  if (normalizeLanguage(language) !== 'en') return value;
  const text = String(value || '');
  const trimmed = text.trim();
  if (!trimmed) return text;
  let translation = ENGLISH_UI[trimmed]
    || ENGLISH_UI_NORMALIZED.get(trimmed.toLocaleLowerCase('fr'));
  if (!translation) {
    const composite = trimmed.match(/^([^:]{1,80}?)(\s*:\s*)(.+)$/);
    if (composite) {
      const sourceLabel = composite[1].trim();
      const sourceValue = composite[3].trim();
      const translatedLabel = ENGLISH_UI[sourceLabel]
        || ENGLISH_UI_NORMALIZED.get(sourceLabel.toLocaleLowerCase('fr'))
        || sourceLabel;
      const translatedValue = ENGLISH_UI[sourceValue]
        || ENGLISH_UI_NORMALIZED.get(sourceValue.toLocaleLowerCase('fr'))
        || sourceValue;
      if (translatedLabel !== sourceLabel || translatedValue !== sourceValue) {
        translation = `${translatedLabel}${composite[2]}${translatedValue}`;
      }
    }
  }
  if (!translation) {
    for (const [pattern, replacement] of TEMPLATE_TRANSLATORS) {
      if (pattern.test(trimmed)) {
        translation = trimmed.replace(pattern, replacement);
        break;
      }
    }
  }
  if (!translation) return text;
  return text.replace(trimmed, translation);
}

function shouldIgnore(node) {
  const parent = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return !parent || Boolean(parent.closest('[data-no-translate], script, style, code, pre'));
}

function translateTextNode(node, language) {
  if (shouldIgnore(node)) return;
  const lastTranslation = translatedText.get(node);
  if (!originalText.has(node) || (lastTranslation !== undefined && node.nodeValue !== lastTranslation)) {
    originalText.set(node, node.nodeValue);
  }
  const source = originalText.get(node) ?? node.nodeValue;
  const nextValue = normalizeLanguage(language) === 'fr' ? source : translateWorkspaceText(source, language);
  translatedText.set(node, nextValue);
  if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
}

function translateElement(element, language) {
  if (shouldIgnore(element)) return;
  const savedAttributes = originalAttributes.get(element) || {};
  TRANSLATED_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const current = element.getAttribute(attribute);
    const previousState = savedAttributes[attribute];
    const source = !previousState || current !== previousState.translated
      ? current
      : previousState.source;
    const nextValue = normalizeLanguage(language) === 'fr' ? source : translateWorkspaceText(source, language);
    savedAttributes[attribute] = { source, translated: nextValue };
    if (current !== nextValue) element.setAttribute(attribute, nextValue);
  });
  originalAttributes.set(element, savedAttributes);
}

function translateTree(root, language) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateElement(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
    else translateElement(node, language);
    node = walker.nextNode();
  }
}

export function useWorkspaceLanguage(language) {
  useEffect(() => {
    const normalizedLanguage = normalizeLanguage(language);
    document.documentElement.lang = normalizedLanguage;
    translateTree(document.body, normalizedLanguage);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') translateTextNode(mutation.target, normalizedLanguage);
        mutation.addedNodes.forEach((node) => translateTree(node, normalizedLanguage));
        if (mutation.type === 'attributes') translateElement(mutation.target, normalizedLanguage);
      });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATED_ATTRIBUTES,
    });
    return () => observer.disconnect();
  }, [language]);
}
