# Audit Et Nettoyage Du Workspace

Date : 2026-06-01

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

Dernière passe du 2026-06-01 :

- uniformisation des imports de pages vers le design system `frontend/src/components/ui` ;
- suppression du fichier fournisseur obsolète `frontend/src/pages/supplier/Dashboard.jsx`, remplacé par `Analysedon.jsx` et non référencé par le routeur ;
- suppression de styles morts non référencés dans `App.css` :
  - anciens blocs `supplier-file-list` ;
  - ancien bloc `supplier-settings` remplacé par `supplier-settings-page` ;
  - ancien bloc `admin-products-pending` remplacé par la validation inline dans le tableau Articles ;
- vérification syntaxique backend avec `node --check backend/server.js` et `node --check backend/app.js` ;
- vérification frontend avec `npm run lint` et `npm run build`.

Le build frontend produit uniquement l'avertissement connu de chunk Vite supérieur à `500 kB`.

## Nettoyage Standard

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
- `SupplierShell.jsx` : layout fournisseur.

Les trois layouts utilisent les mêmes composants UI :

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
- `Articles.jsx`
- `CategoriesFiltres.jsx`
- `Fournisseurs.jsx`
- `NouvellesDemandes.jsx`
- `Utilisateurs.jsx`
- `Simulations.jsx`
- `Support.jsx`
- `Paramètres.jsx`
- `PageShell.jsx`

`Support.jsx` regroupe tickets, feedback et signalements prix.

`Paramètres.jsx` regroupe configuration simulations et coefficients régionaux.

`PageShell.jsx` centralise les blocs UI communs aux pages admin et réexporte certains composants du design system partagé.

Les données backoffice locales et dynamiques sont centralisées dans `frontend/src/services/adminData.js`.

### Pages Supplier

Toutes les pages fournisseur sont regroupées dans `frontend/src/pages/supplier/` :

- `Analysedon.jsx`
- `MaBoutique.jsx`
- `Produits.jsx`
- `AjouterProduit.jsx`
- `Catalogue.jsx`
- `Clients.jsx`
- `Fichiers.jsx`
- `Parametres.jsx`
- `Pending.jsx`

Le fichier historique `Dashboard.jsx` a été supprimé : le routeur pointe directement vers `Analysedon.jsx`.

### Composants Partagés

- `components/ui/Button.jsx`
- `components/ui/Text.jsx`
- `components/ui/Icon.jsx`
- `components/ui/Badge.jsx`
- `components/ui/Card.jsx`
- `components/ui/DataTable.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Pagination.jsx`
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
- `/api/supplier`

### Admin API

Routes admin protégées par `protect` + `requireAdmin` :

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id/role`
- `GET /api/admin/suppliers`
- `GET /api/admin/supplier-requests`
- `POST /api/admin/supplier-requests/:id/approve`
- `POST /api/admin/supplier-requests/:id/reject`
- `GET /api/supplier/me`
- `PUT /api/supplier/me`
- `GET /api/supplier/workspace`
- `GET /api/supplier/products`
- `POST /api/supplier/products`
- `PUT /api/supplier/products/:productId`
- `DELETE /api/supplier/products/:productId`

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

- garder `src/components/ui/` comme point d'entrée du design system partagé ;
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
