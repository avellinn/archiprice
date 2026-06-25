# Audit Et Nettoyage Du Workspace

Date : 2026-06-09

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

Dernière passe du 2026-06-10 :

- suppression des artefacts générés avec `npm run clean` :
  - `frontend/dist` ;
  - `frontend/node_modules/.vite` ;
  - `frontend/node_modules/.vite-temp` ;
  - `frontend/node_modules/.tmp` ;
  - `backend/node_modules/.cache` ;
- vérification que les pages frontend actives sont organisées par dossiers `Page/Page.jsx` + `Page/Page.css` ;
- mise à jour du README et de la documentation frontend pour retirer les références obsolètes à l'ancien catalogue supplier et aux limites d'upload côté interface ;
- ajout de la documentation MVC/data-flow : `docs/ARCHITECTURE_MVC_DATA_FLOW.md`.
- mise à jour de la documentation pour les trois rôles `user`, `admin`, `supplier` ;
- clarification du dark mode global et des variables `--app-*` ;
- clarification de l'usage obligatoire de `Alert.jsx` pour les messages applicatifs et les actions de boutons dans les modales ;
- documentation du canal realtime `/api/realtime`.
- regroupement de la grille, des catégories et des filtres dans `Catalogue.jsx` afin de supprimer les anciens composants orphelins ;
- utilisation directe de `Newproject.jsx` sans wrapper de compatibilité ;
- ajout de l'option `Autre` au champ `Type de pièce` de la modale de création de projet ;
- ajout de l'option `Autre` éditable aux champs option du formulaire admin article ;
- retrait de la colonne `Statut` dans la page admin `Simulations` ;
- suppression de `Logo.jsx` et `Logo.css` ; le logo est désormais rendu par import direct de `log.png` dans les layouts ;
- dark mode du logo déplacé vers `Sidebar.css`, `Header.css` et `AuthLayout.css` ;
- verrouillage de l'accès supplier : `role: "supplier"` plus profil `Supplier` valide, jamais `type` ou `category` seuls ;
- restauration de la validation admin des produits supplier avant affichage dans le catalogue user ;
- vérification des artefacts : aucun `dist`, cache Vite ou fichier temporaire persistant avant build ; après vérification, `npm run clean` supprime les artefacts générés.

Le build frontend est validé sans avertissement de chunk supérieur à `500 kB` depuis la mise en place du chargement différé des pages.

## Nettoyage du 19 juin 2026

- graphe d'imports vérifié depuis `frontend/src/main.jsx` et `backend/server.js` : aucun fichier JS, JSX ou CSS orphelin restant ;
- suppression de 16 anciens composants, wrappers, styles et services sans consommateur ;
- suppression de trois variantes de logo inutilisées ; `log.png` reste l'unique asset de marque ;
- suppression des artefacts régénérables via `npm run clean` ;
- chargement différé des pages avec `React.lazy` et `Suspense` dans `App.jsx` ;
- bundle principal ramené d'environ `961 kB` à `368 kB` avant gzip, sans avertissement de chunk supérieur à `500 kB` ;
- documentation alignée sur les chemins réellement actifs.

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

Après nettoyage, les caches Vite et le dossier `frontend/dist` généré sont supprimés. Si `npm run build` est relancé, `frontend/dist` sera recréé automatiquement puis pourra être supprimé à nouveau avec `npm run clean`.

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
- `Alert`
- `Table`

La différence se situe dans les menus, routes et contenus métier.

### Pages Utilisateur

Toutes les pages utilisateur sont regroupées dans `frontend/src/pages/user/` :

- `Home/Home.jsx`
- `Login/Login.jsx`
- `Register/Register.jsx`
- `Dashboard/Dashboard.jsx`
- `Catalogue/Catalogue.jsx`
- `Workspace/Workspace.jsx`
- `Demande/Demande.jsx`
- `Archives/Archives.jsx`
- `Support/Support.jsx`
- `Logout/Logout.jsx`
- `Parametres/Parametres.jsx`

### Pages Admin

Toutes les pages admin sont regroupées dans `frontend/src/pages/admin/` :

- `Dashboard/Dashboard.jsx`
- `Articles/Articles.jsx`
- `CategoriesFiltres/CategoriesFiltres.jsx`
- `Fournisseurs/Fournisseurs.jsx`
- `Utilisateurs/Utilisateurs.jsx`
- `Simulations/Simulations.jsx`
- `Support/Support.jsx`
- `Paramètres/Paramètres.jsx`

`Support.jsx` regroupe tickets, feedback et signalements prix.

`Paramètres.jsx` regroupe configuration simulations et coefficients régionaux.

Les pages admin utilisent directement le design system partagé dans `frontend/src/components/ui/`.

Les données backoffice locales et dynamiques sont centralisées dans `frontend/src/services/adminData.js`.

Les pages admin n'utilisent plus les alertes navigateur pour les messages métier. Les erreurs et confirmations passent par `Alert.jsx` ou par des modales React.

### Pages Supplier

Toutes les pages fournisseur sont regroupées dans `frontend/src/pages/supplier/` :

- `Dashboard/Dashboard.jsx`
- `MaBoutique/MaBoutique.jsx`
- `Produits/Produits.jsx`
- `AjouterProduit/AjouterProduit.jsx`
- `Clients/Clients.jsx`
- `Demandesup/Demandesup.jsx`
- `Fichiers/Fichiers.jsx`
- `Support/Support.jsx`
- `Parametres/Parametres.jsx`

Le routeur pointe vers `Dashboard/Dashboard.jsx`. La page catalogue supplier a été retirée du routeur ; les produits fournisseur sont gérés via `Produits`, `AjouterProduit`, `MaBoutique` et `Fichiers`.

Les pages `Demande` et `Demandesup` gèrent les conversations user/boutique. Les conversations sont affichées en liste cliquable, groupées par boutique ou client/projet. Un clic marque le message comme lu (badge « Message lu », texte regular). Les alertes d'action utilisent `Alert` en toast (3,5s).

### Catalogue et Archives

- Première visite catalogue : création de projet obligatoire via `Newproject.jsx` (`deferCreation`).
- Après création : accès catalogue **48h** sans nouveau projet (`archiprice:catalogue_project_created_at:{userId}`).
- Chaque projet créé est copié dans **Archives** via `upsertProjectArchive` (localStorage scopé par userId).

### Admin — comptes inexistants

- Statut soft-delete (`Supprimé`) ou entrée absente de MongoDB → badge **Inexistant**.
- Suppression définitive disponible (API ou purge cache admin si orphelin).

### Composants Partagés

- `components/ui/Button.jsx`
- `components/ui/Text.jsx`
- `components/ui/Icon.jsx`
- `components/ui/Badge.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Alert.jsx`
- `components/ui/Table.jsx`
- `components/ui/ServerError.jsx`
- `Header.jsx`
- `Sidebar.jsx`
- `Avatar.jsx`
- `DonutChart.jsx`
- `PasswordInput.jsx`
- `Newproject.jsx`
- `EspaceProWorkspace.jsx`

`Logo.jsx` centralise l'affichage de l'unique asset `frontend/src/assets/images/log.png`.

`Alert.jsx` est obligatoire pour les retours applicatifs. Par défaut, les alertes avec `onClose` s'affichent en toast fixe (portal `document.body`, sans décalage de layout) et se ferment automatiquement après **3,5 secondes**. Utiliser `layout="inline"` pour les alertes persistantes intégrées au contenu (modales, formulaires, états vides).

## Backend Actuel

### Routes Principales

- `/api/health`
- `/api/auth`
- `/api/projects`
- `/api/projects/:projectId/products`
- `/api/admin`
- `/api/supplier`
- `/api/realtime`

### Admin API

Routes admin protégées par `protect` + `requireAdmin` :

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id/role`
- `GET /api/admin/suppliers`
- `GET /api/supplier/me`
- `PUT /api/supplier/me`
- `GET /api/supplier/workspace`
- `GET /api/supplier/products`
- `POST /api/supplier/products`
- `PUT /api/supplier/products/:productId`
- `DELETE /api/supplier/products/:productId`
- `DELETE /api/supplier/products/:productId/images`

### Realtime

Le backend expose `/api/realtime`, un canal Server-Sent Events authentifié.

Il sert à synchroniser :

- créations/modifications/suppressions user ;
- projets ;
- produits ;
- catalogue config ;
- fournisseurs ;
- publications supplier ;
- notifications entre user/admin/supplier.

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
- éviter les doublons de composants entre user, admin et supplier ;
- déplacer progressivement les grands blocs CSS de page hors de `App.css`.
- conserver les styles de page dans le dossier de la page ;
- conserver les messages applicatifs dans `Alert.jsx`.

Priorité 2 :

- continuer à sortir les derniers styles transversaux de `App.css` vers les CSS de pages ;
- ajouter du code splitting par route avec `React.lazy()` pour réduire le warning Vite sur le bundle ;
- déplacer progressivement la logique volumineuse de `backend/routes/admin.js` et `backend/routes/supplier.js` vers des contrôleurs/services.

Priorité 3 :

- ajouter des tests frontend sur les guards `ProtectedRoute` et `AdminRoute` ;
- ajouter des tests API sur `requireAdmin` et les routes admin.

## Documentation Mise À Jour

- `README.md` : routes supplier actuelles, règles d'upload sans limite arbitraire côté interface, lien vers l'architecture MVC.
- `frontend/docs/frontend-documentation.md` : chemins de pages en dossiers, retrait du catalogue supplier obsolète, repères CSS actualisés.
- `docs/ARCHITECTURE_MVC_DATA_FLOW.md` : description détaillée du modèle MVC et des flux de données user/admin/supplier.
- `frontend/docs/design-system.md` : règle shared design system, dark mode et alertes applicatives.
- `docs/API.md` : routes realtime, supplier, admin, uploads Cloudinary et PDF.

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
