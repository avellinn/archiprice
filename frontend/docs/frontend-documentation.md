# Documentation Frontend ArchiPrice

Cette documentation décrit l'état actuel du frontend ArchiPrice, son organisation, ses pages, ses composants, ses styles et les repères utiles pour personnaliser l'interface.

## Vue D'ensemble

Le frontend est une SPA React construite avec Vite.

- Entrée React : `src/main.jsx`
- Racine applicative : `src/App.jsx`
- Entrée des styles globaux : `src/index.css`
- Polices CDN : `src/styles/fonts.css`
- Variables et reset globaux : `src/styles/globals.css`
- Layouts et styles de pages : `src/App.css`
- Pages routées : `src/pages/admin/`, `src/pages/user/` et `src/pages/supplier/`
- Composants réutilisables : `src/components/`
- Services API : `src/services/`
- Authentification : `src/context/`

## Règle D'Interface

Le frontend suit une règle stable :

**70 à 80% mutualisé, 20 à 30% spécifique au rôle.**

Les composants UI génériques sont partagés entre toutes les interfaces. Les layouts, routes et menus restent spécifiques au rôle.

Documentation dédiée : `docs/design-system.md`.

À retenir :

- `src/components/ui/` est le point d'entrée du design system partagé : boutons, tables, badges, empty states, icônes et typographie.
- `src/components/` contient encore les composants de layout ou métier plus larges : header, sidebar, avatar, modales, charts et workspace.
- `src/pages/admin/` contient uniquement les pages backoffice.
- `src/pages/user/` contient uniquement les pages utilisateur.
- `src/pages/supplier/` contient uniquement les pages fournisseur validé.
- `AppShell.jsx` contient le layout utilisateur.
- `AdminShell.jsx` contient le layout administrateur.
- `SupplierShell.jsx` contient le layout fournisseur.
- `ProtectedRoute.jsx` protège l'interface utilisateur.
- `AdminRoute.jsx` protège l'interface administrateur.
- `SupplierRoute.jsx` protège l'interface fournisseur.
- Les variantes de rôle doivent rester minimales, par exemple `.sidebar--admin`, sans créer une identité CSS séparée.

Scripts courants depuis `frontend/` :

```bash
npm run dev
npm run lint
npm run build
```

## Routes

Les routes sont déclarées dans `src/App.jsx`.

Routes publiques :

- `/` : accueil
- `/login` : connexion
- `/register` : inscription

Routes protégées :

- `/dashboard` : tableau de bord
- `/catalogue` : explorer catalogue
- `/workspace` : mon espace de travail
- `/factures` : estimations/documents exportés
- `/deconnexion` : confirmation de déconnexion

Les routes protégées passent par `ProtectedRoute`, puis sont rendues dans `AppShell`.

Routes admin :

- `/admin/dashboard` : tableau de bord admin
- `/admin/catalogue/products` : produits
- `/admin/catalogue/filters` : catégories & filtres
- `/admin/suppliers` : fournisseurs
- `/admin/suppliers/requests` : redirection héritée vers `/admin/suppliers`
- `/admin/users` : utilisateurs
- `/admin/simulations` : simulations
- `/admin/support` : support regroupant tickets, feedback et signalements prix
- `/admin/settings` : paramètres regroupant configuration simulations et coefficients régionaux

Les anciennes URLs `/admin/support/tickets`, `/admin/support/feedback`, `/admin/support/price-reports`, `/admin/settings/simulations` et `/admin/settings/regional-coefficients` redirigent vers les pages regroupées.

Les routes admin passent par `AdminRoute`, puis sont rendues dans `AdminShell`.

Routes supplier :

- `/supplier/dashboard` : analyses de données
- `/supplier/shop` : ma boutique
- `/supplier/products` : produits
- `/supplier/products/new` : ajout de produit avec upload d'images
- `/supplier/clients` : clients
- `/supplier/content/files` : fichiers
- `/supplier/settings` : paramètres

La page catalogue fournisseur historique a été retirée. Les catalogues/produits fournisseur sont maintenant gérés par `Produits`, `AjouterProduit`, `MaBoutique` et `Fichiers`.

Les routes supplier passent par `SupplierRoute`, puis sont rendues dans `SupplierShell`. `SupplierRoute` ne se contente pas de lire `user.role` : il vérifie aussi `/api/supplier/me`. Si aucun profil boutique valide n'existe, le compte est redirigé vers `/dashboard`.

## Pages

### Admin

Fichiers :

- `src/pages/admin/Dashboard/Dashboard.jsx`
- `src/pages/admin/Articles/Articles.jsx`
- `src/pages/admin/CategoriesFiltres/CategoriesFiltres.jsx`
- `src/pages/admin/Fournisseurs/Fournisseurs.jsx`
- `src/pages/admin/Utilisateurs/Utilisateurs.jsx`
- `src/pages/admin/Simulations/Simulations.jsx`
- `src/pages/admin/Support/Support.jsx`
- `src/pages/admin/Paramètres/Paramètres.jsx`

Les données dynamiques admin passent par `src/services/adminMongo.js` quand elles proviennent de MongoDB. `src/services/adminData.js` reste disponible pour les jeux de données locaux ou fallback UI.

`Utilisateurs.jsx` utilise l'API Mongo pour :

- rechercher et filtrer les comptes ;
- ajouter un utilisateur ;
- afficher le rôle réel (`user`, `admin`, `supplier`) ;
- activer/désactiver un compte ;
- bloquer un compte ;
- supprimer un compte.

`Fournisseurs.jsx` affiche les fournisseurs disponibles. Les comptes supplier sont créés directement à l'inscription ou depuis l'administration des utilisateurs.

Les pages admin sont rendues dans `AdminShell.jsx` et protégées par `AdminRoute.jsx`.

### Supplier

Fichiers :

- `src/pages/supplier/Dashboard/Dashboard.jsx`
- `src/pages/supplier/MaBoutique/MaBoutique.jsx`
- `src/pages/supplier/Produits/Produits.jsx`
- `src/pages/supplier/AjouterProduit/AjouterProduit.jsx`
- `src/pages/supplier/Clients/Clients.jsx`
- `src/pages/supplier/Fichiers/Fichiers.jsx`
- `src/pages/supplier/Parametres/Parametres.jsx`

Le workflow fournisseur :

1. inscription avec `Type de compte = Fournisseur` ;
2. le backend crée le compte `supplier` et lie le profil boutique ;
3. le fournisseur accède immédiatement à `SupplierShell`.

`AjouterProduit.jsx` est une page secondaire fonctionnelle :

- route : `/supplier/products/new` ;
- formulaire produit : titre, description, catégorie, prix, statut ;
- upload multiple d'images via `multipart/form-data`, sans limite arbitraire côté interface admin/supplier ;
- aperçu local des images avant envoi ;
- service utilisé : `src/services/supplier.js`.

À l'enregistrement, le bouton `Publier` crée/met à jour le produit fournisseur puis soumet une proposition au backoffice. L'article reste en `publicationStatus: "En attente"` tant que l'admin ne l'a pas validé dans `Articles.jsx`. Les refus admin créent une notification fournisseur avec justification.

### Dashboard

Fichier : `src/pages/user/Dashboard/Dashboard.jsx`

Le dashboard affiche :

- statistiques projets : en cours, terminés, traités, total ;
- graphique d'activité ;
- liste des projets récents ;
- donut chart dynamique de répartition ;
- CTA `Nouveau projet` qui redirige vers `/workspace?newProject=1`.

La page est pensée comme une vue one-page sans scroll global.

### Catalogue

Fichier : `src/pages/user/Catalogue/Catalogue.jsx`

La page catalogue est structurée en trois zones :

- gauche : filtres dynamiques par catégorie, pièce et gamme ;
- centre : cartes produits avec photo visuelle, nom, prix min/max, boutique et bouton `Ajouter` ;
- droite : simulation budget sticky.

Le budget live calcule dynamiquement :

- budget cible ;
- estimation min ;
- estimation max ;
- dépassement éventuel.

Les données produits proviennent du store synchronisé `src/services/adminData.js`, alimenté par les actions admin et supplier. Seuls les articles validés (`publicationStatus` absent ou `Validé`) apparaissent dans le catalogue utilisateur.

### Workspace

Fichier : `src/pages/user/Workspace/Workspace.jsx`

La page workspace contient deux modes :

- vue initiale : 4 cards cliquables ;
- vue miniature : cards compactes en haut et espace projet détaillé via `EspacePro`.

Fonctions principales :

- création de projet via `Newproject` ;
- liste dynamique des projets récents ;
- accès aux articles choisis par projet ;
- informations projet en bas de la zone centrale ;
- bouton flottant `Où acheter` avec choix dynamique de boutiques recommandées ;
- bouton retour vers les 4 cards.

### Authentification

Fichiers :

- `src/pages/user/Login/Login.jsx`
- `src/pages/user/Register/Register.jsx`
- `src/pages/user/Logout/Logout.jsx`

Les pages login/register utilisent `AuthLayout`, `PasswordInput`, `react-hook-form` et `AuthContext`.

## Composants Principaux

- `AppShell.jsx` : structure des pages connectées, sidebar, header, thème, menus.
- `AdminShell.jsx` : structure des pages administrateur, avec les mêmes composants UI et un layout spécifique admin.
- `SupplierShell.jsx` : structure des pages fournisseur, avec les mêmes composants UI et un layout spécifique supplier.
- `AdminRoute.jsx` : protection des routes admin selon le rôle `admin`.
- `SupplierRoute.jsx` : protection des routes supplier selon le rôle `supplier` et l'existence d'un profil boutique via `/api/supplier/me`.
- `Sidebar.jsx` : navigation latérale. Styles isolés dans `Sidebar.css`.
- `Header.jsx` : barre supérieure, recherche, thème, utilisateur.
- `Avatar.jsx` : avatar utilisateur dynamique.
- `components/ui/Alert.jsx` : messages d'information, succès, avertissement et erreur. Les interfaces ne doivent pas utiliser les alertes navigateur pour les messages applicatifs.
- `components/ui/Button.jsx` : bouton générique avec variantes `primary`, `secondary`, `success`, `danger`, `outline`, `ghost`.
- `components/ui/Icon.jsx` : registre central des icônes SVG via le design system.
- `components/ui/Table.jsx` : table adaptable aux pages métier.
- `components/ui/ServerError.jsx` : écran d'erreur serveur.
- `DonutChart.jsx` : chart donut basé sur Recharts.
- `Workspace.jsx` : hub et cards du workspace.
- `EspaceProWorkspace.jsx` : layout détaillé des projets.
- `modalBoutique.jsx` : modal "Où acheter" alimentée exclusivement par la liste des fournisseurs validés côté admin.
- `recap.jsx` : récapitulatif d'estimation.
- `Newproject.jsx` : modale de création de projet. Le champ `Type de pièce` propose `Autre` pour saisir une pièce personnalisée.
- `Text.jsx` : composant typographique.

### Sidebar Partagée

`Sidebar.jsx` est utilisée par les interfaces user, admin et supplier.

Elle supporte :

- liens directs ;
- actions, par exemple déconnexion ;
- sous-menus ;
- ouverture des sous-menus au survol ;
- ouverture/fermeture des sous-menus au clic ;
- état actif basé sur la route courante ;
- variante minimale de rôle via `variant`.

Le style de base reste uniforme entre user, admin et supplier. Le titre du sidebar supplier n'est pas affiché ; seuls le logo et les liens structurent la navigation.

Le composant `Logo.jsx` centralise l'affichage de `src/assets/images/log.png` pour :

- `AuthLayout.jsx` pour les pages auth ;
- `Header.jsx` pour l'en-tête public ;
- `AppShell.jsx`, `AdminShell.jsx`, `SupplierShell.jsx` pour la sidebar.

Le dark mode du logo est géré par les CSS actifs :

- `Sidebar.css` : fond blanc du logo en `.dashboard-shell.is-theme-dark` ;
- `Header.css` : support du logo public en thème sombre ;
- `AuthLayout.css` : support des pages auth si elles héritent d'un thème sombre.

### Header, Recherche Et Dark Mode

`Header.jsx` est partagé par les trois shells. Il gère :

- recherche indexée par page via le paramètre `q` ;
- icône de recherche adaptée au contexte de page ;
- menu utilisateur ;
- notifications ;
- toggle dark mode.

Le dark mode est appliqué au root `.dashboard-shell.is-theme-dark`. Les variables CSS transversales dans `App.css` pilotent désormais l'ensemble du workspace :

```css
--app-shell-background
--app-content-background
--dashboard-page-background
--app-panel-background
--app-card-background
--app-text-color
--app-muted-color
--app-heading-color
--app-border-color
```

Les composants et pages doivent utiliser ces variables plutôt que des fonds fixes. Le header, le sidebar, les pages user/admin/supplier, les modals et les cartes principales sont branchés sur ces variables.

## Services API

Tous les appels API passent par `src/services/api.js`.

- `auth.js` : login, register, profil courant.
- `adminData.js` : store local dynamique des données backoffice.
- `projects.js` : CRUD projets.
- `products.js` : CRUD produits liés à un projet.
- `supplier.js` : workspace fournisseur, CRUD produits supplier et upload d'images.
- `realtime.js` : connexion Server-Sent Events à `/api/realtime`.
- `exportedDocuments.js` : documents PDF exportés côté user.

Les routes API sont centralisées dans `src/constants/api.js`.

## Organisation CSS

### `src/index.css`

Point d'entrée CSS global. Il importe :

```css
@import './styles/fonts.css';
@import './styles/globals.css';
```

### `src/styles/fonts.css`

Charge les polices depuis Google Fonts CDN :

- `Montserrat` : titres ;
- `Open Sans` : corps de texte.

### `src/styles/globals.css`

Contient les variables globales :

- couleurs ;
- typographies ;
- espacements ;
- rayons ;
- ombres ;
- reset de base.

Les variables typographiques principales sont :

```css
--font-primary: "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-heading: "Montserrat", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

`body` utilise `--font-primary`. Les titres `h1` à `h6` utilisent `--font-heading`.

Modifier ici les choix partagés par toute l'application.

### `src/App.css`

Contient les styles transversaux :

- shell connecté ;
- responsive global.

Les styles de page doivent rester dans le dossier de la page concernée :

- `src/pages/user/Dashboard/Dashboard.css`
- `src/pages/user/Workspace/Workspace.css`
- `src/pages/admin/Articles/Articles.css`
- `src/pages/supplier/AjouterProduit/AjouterProduit.css`

Pour changer le fond des pages connectées, regarder les variables de `.dashboard-shell`, notamment :

```css
--app-shell-background
--app-content-background
--dashboard-page-background
--app-panel-background
--app-card-background
```

### CSS de composants

Chaque composant important possède son CSS propre quand son style est suffisamment autonome :

- `Sidebar.css`
- `Header.css`
- `Button.css`
- `Avatar.css`
- `Icon.css`
- `DonutChart.css`
- `Workspace.css`
- `EspaceProWorkspace.css`
- `Newproject.css`
- `pages/user/Catalogue/Catalogue.css`
- `AuthLayout.css`
- `PasswordInput.css`
- `Text.css`

## Interfaces User Et Admin

### User

Le layout utilisateur est `AppShell.jsx`.

Il contient :

- sidebar user ;
- header ;
- recherche ;
- notifications ;
- avatar ;
- dark mode ;
- routes protégées user.

### Admin

Le layout admin est `AdminShell.jsx`.

Il contient :

- sidebar admin ;
- header partagé ;
- recherche admin ;
- notifications admin ;
- avatar ;
- dark mode ;
- routes protégées admin.

La sidebar admin a des menus spécifiques, mais réutilise les mêmes styles que la sidebar user.

Les pages admin utilisent `Alert.jsx` pour les erreurs, confirmations et messages métier. Les anciennes alertes navigateur (`alert`, `confirm`, `prompt`) ne doivent plus être utilisées côté admin.

### Supplier

Le layout fournisseur est `SupplierShell.jsx`.

Il contient :

- sidebar supplier ;
- header partagé ;
- recherche ;
- notifications de publication/refus ;
- avatar ;
- dark mode ;
- routes protégées supplier.

### Guards

- `GuestRoute.jsx` : empêche un utilisateur connecté de voir login/register.
- `ProtectedRoute.jsx` : protège les routes user et renvoie un admin vers `/admin/dashboard` ou un supplier vers `/supplier/dashboard`.
- `AdminRoute.jsx` : protège les routes admin et renvoie un non-admin vers `/dashboard`.
- `SupplierRoute.jsx` : protège les routes supplier et renvoie un non-supplier vers son espace autorisé.

## Repères De Personnalisation

Modifier la navigation :

1. `src/components/AppShell.jsx`
2. vérifier la route dans `src/App.jsx`
3. ajuster les icônes dans `Icon.jsx` si nécessaire

Modifier le catalogue :

1. données visibles : `src/services/catalogueProducts.js`
2. rendu user : `src/pages/user/Catalogue/Catalogue.jsx`
3. rendu des cards, catégories et filtres : `src/pages/user/Catalogue/Catalogue.jsx`
4. layout et style : `src/pages/user/Catalogue/Catalogue.css`
5. données visibles : uniquement les articles validés par l'admin via `/api/catalogue/products`.

`adminData.products` ne doit plus être utilisé pour afficher le catalogue user. Cette clé est réservée au nettoyage legacy et doit rester vide.

Modifier le parcours fournisseur :

1. liste CRUD : `src/pages/supplier/Produits/Produits.jsx`
2. création produit brouillon : `src/pages/supplier/AjouterProduit/AjouterProduit.jsx`
3. publication/retrait : `src/pages/supplier/Produits/Produits.jsx`, via `updateSupplierProductPublication`
4. boutique et nouveautés : `src/pages/supplier/MaBoutique/MaBoutique.jsx`
5. fichiers : `src/pages/supplier/Fichiers/Fichiers.jsx`
6. API supplier : `src/services/supplier.js`

Modifier le workspace :

1. orchestration : `src/pages/user/Workspace/Workspace.jsx`
2. cards du hub : `Workspace.jsx` et `Workspace.css`
3. espace projet : `EspaceProWorkspace.jsx` et `EspaceProWorkspace.css`
4. modal "Où acheter" : `modalBoutique.jsx` et `modalBoutique.css`
5. fournisseurs proposés : liste synchronisée depuis `pages/admin/Fournisseurs/`.

Modifier le catalogue :

1. orchestration : `src/pages/user/Catalogue/Catalogue.jsx`
2. grille, catégories et filtres : `src/pages/user/Catalogue/Catalogue.jsx`
3. styles : `src/pages/user/Catalogue/Catalogue.css`
4. simulation budget : `simulBudget.jsx` et `simulBudget.css`

Modifier le dashboard :

1. logique : `src/pages/user/Dashboard/Dashboard.jsx`
2. styles : `src/pages/user/Dashboard/Dashboard.css`

## Nettoyage Et Build

Depuis la racine :

```bash
npm run clean
```

Le script supprime :

- `frontend/dist`
- caches Vite : `.vite`, `.vite-temp`, `.tmp`
- cache backend éventuel : `backend/node_modules/.cache`

Important : le script `clean` existe à la racine du monorepo, pas dans `frontend/package.json`.

Dernière passe de nettoyage :

- aucun artefact `frontend/dist`, cache Vite ou fichier temporaire n'était présent avant build ;
- `frontend/dist` a été recréé par vérification build puis supprimé via `npm run clean` ;
- la colonne `Statut` a été retirée de `admin/Simulations` ;
- la grille, les catégories et les filtres sont regroupés dans `pages/user/Catalogue/Catalogue.jsx` avec `Catalogue.css`.

Ne pas commiter :

- `node_modules/`
- `frontend/dist/`
- `.env`
- caches locaux

## Checklist Avant Livraison

```bash
cd frontend
npm run lint
npm run build
```

Le warning Vite sur les chunks > 500 kB est connu. Il n'est pas bloquant, mais une future optimisation peut passer par du code splitting.
