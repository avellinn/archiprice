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
- Pages routées : `src/pages/admin/` et `src/pages/user/`
- Composants réutilisables : `src/components/`
- Services API : `src/services/`
- Authentification : `src/context/`

## Règle D'Interface

Le frontend suit une règle stable :

**70 à 80% mutualisé, 20 à 30% spécifique au rôle.**

Les composants UI génériques sont partagés entre toutes les interfaces. Les layouts, routes et menus restent spécifiques au rôle.

Documentation dédiée : `docs/design-system.md`.

À retenir :

- `src/components/` contient les composants partagés : boutons, inputs, tables, modals, cards, badges, loader, empty states, header, sidebar, icônes, typographie.
- `src/pages/admin/` contient uniquement les pages backoffice.
- `src/pages/user/` contient uniquement les pages utilisateur.
- `AppShell.jsx` contient le layout utilisateur.
- `AdminShell.jsx` contient le layout administrateur.
- `ProtectedRoute.jsx` protège l'interface utilisateur.
- `AdminRoute.jsx` protège l'interface administrateur.
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
- `/admin/users` : utilisateurs
- `/admin/simulations` : simulations
- `/admin/support` : support regroupant tickets, feedback et signalements prix
- `/admin/settings` : paramètres regroupant configuration simulations et coefficients régionaux

Les anciennes URLs `/admin/support/tickets`, `/admin/support/feedback`, `/admin/support/price-reports`, `/admin/settings/simulations` et `/admin/settings/regional-coefficients` redirigent vers les pages regroupées.

Les routes admin passent par `AdminRoute`, puis sont rendues dans `AdminShell`.

## Pages

### Admin

Fichiers :

- `src/pages/admin/Dashboard.jsx`
- `src/pages/admin/Produits.jsx`
- `src/pages/admin/CategoriesFiltres.jsx`
- `src/pages/admin/Fournisseurs.jsx`
- `src/pages/admin/Utilisateurs.jsx`
- `src/pages/admin/Simulations.jsx`
- `src/pages/admin/Support.jsx`
- `src/pages/admin/Paramètres.jsx`
- `src/pages/admin/PageShell.jsx`

Les données de démonstration et les mutations admin locales sont centralisées dans `src/services/adminData.js`.

`Utilisateurs.jsx` utilise ce store pour :

- rechercher et filtrer les comptes ;
- ajouter un utilisateur ;
- changer le type utilisateur/admin ;
- changer l'abonnement ;
- activer/désactiver un compte ;
- supprimer un compte.

`PageShell.jsx` centralise la structure commune des pages admin : en-tête, statistiques, toolbar, filtres, tables et badges.

Les pages admin sont rendues dans `AdminShell.jsx` et protégées par `AdminRoute.jsx`.

### Dashboard

Fichier : `src/pages/user/Dashboard.jsx`

Le dashboard affiche :

- statistiques projets : en cours, terminés, traités, total ;
- graphique d'activité ;
- liste des projets récents ;
- donut chart dynamique de répartition ;
- CTA `Nouveau projet` qui redirige vers `/workspace?newProject=1`.

La page est pensée comme une vue one-page sans scroll global.

### Catalogue

Fichier : `src/pages/user/Catalogue.jsx`

La page catalogue est structurée en trois zones :

- gauche : filtres dynamiques par catégorie, pièce et gamme ;
- centre : cartes produits avec photo visuelle, nom, prix min/max, boutique et bouton `Ajouter` ;
- droite : simulation budget sticky.

Le budget live calcule dynamiquement :

- budget cible ;
- estimation min ;
- estimation max ;
- dépassement éventuel.

Les données produits sont aujourd'hui locales dans `PRODUCTS`. Si elles deviennent API, conserver la même forme de données côté service.

### Workspace

Fichier : `src/pages/user/Workspace.jsx`

La page workspace contient deux modes :

- vue initiale : 4 cards cliquables ;
- vue miniature : cards compactes en haut et espace projet détaillé via `EspacePro`.

Fonctions principales :

- création de projet via `ModalCreateProject` ;
- liste dynamique des projets récents ;
- accès aux articles choisis par projet ;
- informations projet en bas de la zone centrale ;
- bouton flottant `Où acheter` avec choix dynamique de boutiques recommandées ;
- bouton retour vers les 4 cards.

### Authentification

Fichiers :

- `src/pages/user/Login.jsx`
- `src/pages/user/Register.jsx`
- `src/pages/user/Logout.jsx`

Les pages login/register utilisent `AuthLayout`, `PasswordInput`, `react-hook-form` et `AuthContext`.

## Composants Principaux

- `AppShell.jsx` : structure des pages connectées, sidebar, header, thème, menus.
- `AdminShell.jsx` : structure des pages administrateur, avec les mêmes composants UI et un layout spécifique admin.
- `AdminRoute.jsx` : protection des routes admin selon le rôle `admin`.
- `Sidebar.jsx` : navigation latérale. Styles isolés dans `Sidebar.css`.
- `Header.jsx` : barre supérieure, recherche, thème, utilisateur.
- `Avatar.jsx` : avatar utilisateur dynamique.
- `Button.jsx` : bouton générique avec variantes `primary`, `secondary`, `success`, `danger`, `outline`, `ghost`.
- `Icon.jsx` : registre central des icônes SVG.
- `DonutChart.jsx` : chart donut basé sur Recharts.
- `WorkspaceMiniGrid.jsx` : cards miniatures du workspace.
- `espacepro.jsx` : layout détaillé des projets dans le workspace.
- `ModalCreateProject.jsx` : modale de création de projet.
- `Text.jsx` : composant typographique.

### Sidebar Partagée

`Sidebar.jsx` est utilisée par l'interface user et admin.

Elle supporte :

- liens directs ;
- actions, par exemple déconnexion ;
- sous-menus ;
- ouverture des sous-menus au survol ;
- ouverture/fermeture des sous-menus au clic ;
- état actif basé sur la route courante ;
- variante minimale de rôle via `variant`.

Le style de base reste uniforme entre admin et user.

## Services API

Tous les appels API passent par `src/services/api.js`.

- `auth.js` : login, register, profil courant.
- `adminData.js` : store local dynamique des données backoffice.
- `projects.js` : CRUD projets.
- `products.js` : CRUD produits liés à un projet.

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

Contient les styles transversaux et de pages :

- shell connecté ;
- dashboard ;
- workspace ;
- catalogue ;
- modales ;
- responsive global.

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
- `WorkspaceMiniGrid.css`
- `espacepro.css`
- `ModalCreateProject.css`
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

### Guards

- `GuestRoute.jsx` : empêche un utilisateur connecté de voir login/register.
- `ProtectedRoute.jsx` : protège les routes user et renvoie un admin vers `/admin/dashboard`.
- `AdminRoute.jsx` : protège les routes admin et renvoie un non-admin vers `/dashboard`.

## Repères De Personnalisation

Modifier la navigation :

1. `src/components/AppShell.jsx`
2. vérifier la route dans `src/App.jsx`
3. ajuster les icônes dans `Icon.jsx` si nécessaire

Modifier le catalogue :

1. données produits et filtres : `src/pages/user/Catalogue.jsx`
2. layout et style : blocs `.catalogue-*` dans `src/App.css`

Modifier le workspace :

1. orchestration : `src/pages/user/Workspace.jsx`
2. cards miniatures : `WorkspaceMiniGrid.jsx` et `WorkspaceMiniGrid.css`
3. espace projet : `espacepro.jsx` et `espacepro.css`

Modifier le dashboard :

1. logique : `src/pages/user/Dashboard.jsx`
2. styles : `.dashboard-*`, `.stat-*`, `.history-*` dans `src/App.css`

## Nettoyage Et Build

Depuis la racine :

```bash
npm run clean
```

Le script supprime :

- `frontend/dist`
- caches Vite : `.vite`, `.vite-temp`, `.tmp`
- cache backend éventuel : `backend/node_modules/.cache`

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
