# Documentation Frontend ArchiPrice

Cette documentation décrit l'état actuel du frontend ArchiPrice, son organisation, ses pages, ses composants, ses styles et les repères utiles pour personnaliser l'interface.

## Vue D'ensemble

Le frontend est une SPA React construite avec Vite.

- Entrée React : `src/main.jsx`
- Racine applicative : `src/App.jsx`
- Styles globaux et variables : `src/index.css`
- Layouts et styles de pages : `src/App.css`
- Pages routées : `src/pages/`
- Composants réutilisables : `src/components/`
- Services API : `src/services/`
- Authentification : `src/context/`

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

## Pages

### Dashboard

Fichier : `src/pages/Dashboard.jsx`

Le dashboard affiche :

- statistiques projets : en cours, terminés, traités, total ;
- graphique d'activité ;
- liste des projets récents ;
- donut chart dynamique de répartition ;
- CTA `Nouveau projet` qui redirige vers `/workspace?newProject=1`.

La page est pensée comme une vue one-page sans scroll global.

### Catalogue

Fichier : `src/pages/Catalogue.jsx`

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

Fichier : `src/pages/Workspace.jsx`

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

- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/Logout.jsx`

Les pages login/register utilisent `AuthLayout`, `PasswordInput`, `react-hook-form` et `AuthContext`.

## Composants Principaux

- `AppShell.jsx` : structure des pages connectées, sidebar, header, thème, menus.
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

## Services API

Tous les appels API passent par `src/services/api.js`.

- `auth.js` : login, register, profil courant.
- `projects.js` : CRUD projets.
- `products.js` : CRUD produits liés à un projet.

Les routes API sont centralisées dans `src/constants/api.js`.

## Organisation CSS

### `src/index.css`

Contient les variables globales :

- couleurs ;
- typographies ;
- espacements ;
- rayons ;
- ombres ;
- reset de base.

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

## Repères De Personnalisation

Modifier la navigation :

1. `src/components/AppShell.jsx`
2. vérifier la route dans `src/App.jsx`
3. ajuster les icônes dans `Icon.jsx` si nécessaire

Modifier le catalogue :

1. données produits et filtres : `src/pages/Catalogue.jsx`
2. layout et style : blocs `.catalogue-*` dans `src/App.css`

Modifier le workspace :

1. orchestration : `src/pages/Workspace.jsx`
2. cards miniatures : `WorkspaceMiniGrid.jsx` et `WorkspaceMiniGrid.css`
3. espace projet : `espacepro.jsx` et `espacepro.css`

Modifier le dashboard :

1. logique : `src/pages/Dashboard.jsx`
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
