# Audit Et Nettoyage Du Workspace

Date : 2026-05-22

## Synthèse

Le workspace `archi-price` contient une application fullstack :

- backend Express 5 + Mongoose ;
- frontend React 19 + Vite 8 ;
- documentation projet ;
- scripts utilitaires racine.

Le projet est organisé en monorepo léger avec deux applications indépendantes :

- `backend/` pour l'API ;
- `frontend/` pour la SPA.

## Volumétrie Observée

Les volumes principaux constatés avant nettoyage :

- workspace complet : environ `194 Mo` ;
- `frontend/node_modules` : environ `171 Mo` ;
- `backend/node_modules` : environ `20 Mo` ;
- `frontend/src` : environ `448 Ko` ;
- `frontend/dist` : environ `788 Ko` avant suppression ;
- `.git` : environ `2.3 Mo`.

Conclusion : le poids réel vient presque entièrement des dépendances locales. Elles ne sont pas supprimées car elles sont nécessaires au développement et déjà ignorées par Git.

## Nettoyage Effectué

Commande utilisée depuis la racine :

```bash
npm run clean
```

Le script supprime uniquement des fichiers générés ou caches locaux :

- `frontend/dist`
- `frontend/node_modules/.vite`
- `frontend/node_modules/.vite-temp`
- `frontend/node_modules/.tmp`
- `backend/node_modules/.cache`

Après nettoyage, aucun dossier `frontend/dist`, `.vite`, `.vite-temp`, `.tmp` ou `.cache` n'est présent dans les zones ciblées.

## Ce Qui N'a Pas Été Supprimé

Non supprimé volontairement :

- `frontend/node_modules`
- `backend/node_modules`
- `.env`
- fichiers source modifiés ;
- fichiers non suivis liés aux sprints en cours ;
- dossiers `.agents` et `.codex`.

Raisons :

- `node_modules` est utile au dev local ;
- `.env` est local, sensible et ignoré par Git ;
- les changements non commités font partie du travail en cours ;
- les dossiers de contexte outillage sont minuscules et ne changent pas le poids du workspace.

## État Git Au Moment De L'Audit

Le workspace contient des changements en cours sur :

- backend auth/admin ;
- routes admin ;
- frontend routes admin/user ;
- composants partagés ;
- pages catalogue/workspace/admin ;
- documentation ;
- styles globaux et fonts.

Important : aucun changement utilisateur n'a été revert.

## Frontend Actuel

### Layouts

- `AppShell.jsx` : layout utilisateur.
- `AdminShell.jsx` : layout administrateur.

Les deux layouts utilisent les mêmes composants UI :

- `Header`
- `Sidebar`
- `Button`
- `Icon`
- `Text`
- `Avatar`

La différence se situe dans les menus, routes et contenus métier.

### Pages Utilisateur

Toutes les pages utilisateur sont regroupées dans `frontend/src/pages/user/` :

- `Home.jsx`
- `Login.jsx`
- `Register.jsx`
- `Dashboard.jsx`
- `Catalogue.jsx`
- `Workspace.jsx`
- `Invoices.jsx`
- `Logout.jsx`

### Pages Admin

Toutes les pages admin sont regroupées dans `frontend/src/pages/admin/` :

- `Dashboard.jsx`
- `Produits.jsx`
- `CategoriesFiltres.jsx`
- `Fournisseurs.jsx`
- `Utilisateurs.jsx`
- `Simulations.jsx`
- `Support.jsx`
- `Paramètres.jsx`
- `PageShell.jsx`

`Support.jsx` regroupe tickets, feedback et signalements prix.

`Paramètres.jsx` regroupe configuration simulations et coefficients régionaux.

`PageShell.jsx` centralise les blocs UI communs aux pages admin et réexporte certains composants du design system partagé.

Les données backoffice locales et dynamiques sont centralisées dans `frontend/src/services/adminData.js`.

### Composants Partagés

- `Button.jsx`
- `Text.jsx`
- `Icon.jsx`
- `Header.jsx`
- `Sidebar.jsx`
- `Avatar.jsx`
- `DonutChart.jsx`
- `ModalCreateProject.jsx`
- `PasswordInput.jsx`
- `WorkspaceMiniGrid.jsx`
- `espacepro.jsx`

## Backend Actuel

### Routes Principales

- `/api/health`
- `/api/auth`
- `/api/projects`
- `/api/projects/:projectId/products`
- `/api/admin`

### Admin API

Routes admin protégées par `protect` + `requireAdmin` :

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id/role`
- `GET /api/admin/test`

Les réponses utilisateur admin excluent le mot de passe.

## Politique De Nettoyage

Nettoyage standard :

```bash
npm run clean
```

Nettoyage agressif facultatif :

```bash
rm -rf frontend/node_modules backend/node_modules
npm run install:all
```

Ce nettoyage agressif n'est pas fait automatiquement car il oblige à réinstaller toutes les dépendances.

## Fichiers À Ne Pas Commiter

Déjà couverts par `.gitignore` :

- `node_modules/`
- `frontend/dist/`
- `.env`
- `.env.local`
- `.env.*.local`
- `.vite/`
- `.vite-temp/`
- `.tmp/`
- `.cache/`
- `coverage/`
- logs locaux.

## Optimisations Recommandées

Priorité 1 :

- garder `src/components/` comme design system partagé ;
- éviter les doublons de composants entre admin et user ;
- déplacer progressivement les grands blocs CSS de page hors de `App.css`.

Priorité 2 :

- créer `Dashboard.css`, `Catalogue.css`, `Workspace.css`, `Admin.css` si les pages continuent de grossir ;
- ajouter du code splitting par route avec `React.lazy()` pour réduire le warning Vite sur le bundle ;
- stabiliser les pages admin encore en placeholder.

Priorité 3 :

- ajouter des tests frontend sur les guards `ProtectedRoute` et `AdminRoute` ;
- ajouter des tests API sur `requireAdmin` et les routes admin.

## Commandes De Contrôle

Depuis `frontend/` :

```bash
npm run lint
npm run build
```

Depuis la racine :

```bash
npm run clean
```

Le warning Vite sur les chunks supérieurs à `500 kB` est connu et non bloquant.
