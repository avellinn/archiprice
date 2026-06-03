# Architecture MVC Et Flux De Données

Date : 2026-06-03

Ce document explique comment ArchiPrice organise le code et comment les données circulent entre MongoDB, l'API Express et les interfaces React `user`, `admin` et `supplier`.

## Vue D'Ensemble

ArchiPrice est un monorepo fullstack :

- `backend/` : API Express, modèles Mongoose, contrôleurs, routes et services.
- `frontend/` : SPA React + Vite, pages par rôle, shells de navigation, services API et design system partagé.

Le projet suit une logique MVC côté backend et une séparation proche côté frontend :

- **Model** : documents MongoDB via Mongoose.
- **Controller** : fonctions qui reçoivent la requête, appliquent les règles métier et construisent la réponse.
- **View** : pages React et composants UI.
- **Services** : fonctions techniques réutilisables, côté backend ou frontend.

## Backend MVC

### Models

Les modèles sont dans `backend/models/`.

- `User.js` : authentification, identité, rôle (`user`, `admin`, `supplier`) et statut.
- `Supplier.js` : profil métier fournisseur, boutique, coordonnées et état de validation.
- `SupplierRequest.js` : demandes de partenariat fournisseur avant validation admin.
- `Product.js` : articles/catalogues, prix, catégories, images Cloudinary, propriétaire supplier et statut de publication.
- `Project.js` : projets créés par les utilisateurs.
- `Simulation.js` : estimations exportées et données de récapitulatif.
- `SupportItem.js` : éléments support, feedback et signalements.

Règle importante : le frontend ne décide jamais librement d'un rôle sensible. Le backend force les rôles et contrôle les permissions.

### Controllers

Les contrôleurs sont dans `backend/controllers/`.

- `authController.js` : inscription, connexion, profil courant.
- `projectController.js` : CRUD projets user.
- `productController.js` : produits rattachés aux projets.
- `recapController.js` : export/récapitulatif.
- `uploadController.js` : upload générique si besoin.

Les routes admin et supplier contiennent encore une partie de logique métier dans `backend/routes/admin.js` et `backend/routes/supplier.js`. La règle cible est de déplacer progressivement les blocs volumineux vers `controllers/` ou `services/`.

### Routes

Les routeurs sont dans `backend/routes/`.

- `auth.js` expose `/api/auth`.
- `projects.js` expose `/api/projects`.
- `products.js` expose les produits liés à un projet.
- `admin.js` expose les actions backoffice.
- `supplier.js` expose l'espace fournisseur.
- `catalogueConfig.js` expose la configuration catalogue partagée.
- `uploads.js` expose l'upload quand nécessaire.

Les routes appliquent les middlewares :

- `protect` : vérifie le JWT et charge l'utilisateur.
- `requireAdmin` : limite l'accès aux admins.
- `requireSupplier` : limite l'accès aux fournisseurs validés.
- `requireDb` : protège les endpoints qui nécessitent MongoDB.

### Services Backend

Les services sont dans `backend/services/`.

- `cloudinaryImageService.js` : upload Cloudinary par stream, suppression d'images, validation de fichiers.
- `recapPdfService.js` : génération PDF en mémoire à partir des données MongoDB.

Les images ne sont pas stockées localement. MongoDB conserve uniquement les métadonnées utiles : `secure_url`, `public_id`, dimensions, format, taille.

## Frontend Par Rôle

Les pages sont rangées par rôle dans `frontend/src/pages/`.

- `pages/user/` : interface utilisateur.
- `pages/admin/` : backoffice.
- `pages/supplier/` : fournisseur validé.

Chaque page suit la règle :

```txt
NomPage/
├── NomPage.jsx
└── NomPage.css
```

Les shells sont spécifiques au rôle :

- `AppShell.jsx` : utilisateur.
- `AdminShell.jsx` : administrateur.
- `SupplierShell.jsx` : fournisseur.

Le design system reste partagé dans `frontend/src/components/ui/` et les grands composants communs restent dans `frontend/src/components/`.

## Services Frontend

Les services API sont dans `frontend/src/services/`.

- `api.js` : client Axios unique, gestion JWT, erreurs et intercepteurs.
- `auth.js` : login/register/me.
- `adminData.js` : store synchronisé utilisé comme couche de partage frontend.
- `projects.js` : CRUD projets.
- `products.js` : produits liés aux projets user.
- `supplier.js` : workspace supplier, profil boutique, produits et publication.
- `exportedDocuments.js` : documents exportés visibles côté user.

Les routes API sont centralisées dans `frontend/src/constants/api.js`.

## Flux 1 — Authentification Et Redirection

1. L'utilisateur soumet login/register depuis React.
2. `frontend/src/services/auth.js` appelle `/api/auth`.
3. `backend/controllers/authController.js` valide les données.
4. MongoDB lit ou crée un `User`.
5. Le backend renvoie `{ token, user }`.
6. `AuthContext.jsx` stocke le token et expose le user courant.
7. Les guards redirigent selon le rôle :
   - `user` vers `/dashboard` ;
   - `admin` vers `/admin/dashboard` ;
   - `supplier` vers `/supplier/dashboard` ;
   - supplier non validé vers `/supplier/pending`.

## Flux 2 — Demande Fournisseur

1. Le visiteur choisit le type de compte fournisseur à l'inscription.
2. Le backend crée une entrée `SupplierRequest`.
3. Le compte attend la validation admin.
4. L'admin voit la demande dans `pages/admin/NouvellesDemandes/`.
5. Si la demande est approuvée :
   - le backend crée ou active un `User` avec rôle `supplier` ;
   - le backend crée ou complète un `Supplier` ;
   - le supplier peut accéder à son espace.
6. Si la demande est refusée, la justification est visible côté fournisseur.

## Flux 3 — Données Supplier Vers Admin Fournisseurs

1. Le supplier modifie sa boutique dans `pages/supplier/Parametres/`.
2. React appelle `updateSupplierProfile()` dans `services/supplier.js`.
3. Le backend met à jour le document `Supplier`.
4. La page admin `Fournisseurs` recharge `/api/admin/suppliers`.
5. `services/adminData.js` conserve aussi une copie synchronisée pour les composants qui lisent le store frontend.
6. Le modal user "Où acheter" lit les fournisseurs validés pour proposer des boutiques.

## Flux 4 — Création Et Publication D'Articles Supplier

1. Le supplier crée un article dans `pages/supplier/AjouterProduit/`.
2. Le formulaire est envoyé en `multipart/form-data` avec jusqu'à 12 fichiers `image`.
3. `multer` utilise `memoryStorage`.
4. Le backend stream les images vers Cloudinary.
5. MongoDB stocke les métadonnées Cloudinary dans `Product.images`.
6. Le produit appartient au `supplierId` courant.
7. Quand le supplier publie, le produit passe en attente de validation admin.
8. L'admin voit la proposition dans `pages/admin/Articles/`.
9. Si l'admin valide, le produit devient visible dans `pages/user/Catalogue/`.
10. Si l'admin refuse, le supplier reçoit une notification avec justification.

## Flux 5 — Catalogue User Et Simulation Budget

1. Le catalogue user lit les articles validés.
2. Les filtres viennent de la configuration admin : catégories, pièces, gammes, quartiers, fournisseurs.
3. L'utilisateur ajoute des articles à sa simulation.
4. La simulation budget live calcule :
   - budget cible ;
   - estimation minimum ;
   - estimation maximum ;
   - dépassement éventuel.
5. Après validation, un récapitulatif est généré.
6. Le projet, les articles et le récapitulatif alimentent le workspace.

## Flux 6 — Export PDF Et Estimations Exportées

1. L'utilisateur ouvre un récapitulatif depuis le workspace.
2. Le bouton d'export appelle l'API avec l'ID de simulation ou projet.
3. Le backend récupère les données complètes dans MongoDB :
   - utilisateur ;
   - projet ;
   - produits sélectionnés ;
   - quantités ;
   - prix ;
   - URLs Cloudinary.
4. `recapPdfService.js` génère un PDF en mémoire.
5. Le PDF est renvoyé au navigateur sans stockage intermédiaire.
6. Le document exporté apparaît dans `pages/user/Invoices/`.
7. Les exports sont aussi visibles côté admin dans `pages/admin/Simulations/`.

## Flux 7 — Workspace Et Boutiques

1. Le workspace affiche les projets user.
2. Les articles choisis apparaissent dans `espacepro.jsx`.
3. Les images viennent des métadonnées Cloudinary stockées dans les produits.
4. Le bouton "Où acheter" ouvre un modal de boutiques.
5. Les boutiques viennent de `Supplier` validés, donc de la page admin `Fournisseurs`.
6. Quand l'utilisateur choisit une boutique, une notification client est enregistrée pour le supplier concerné.
7. Le supplier voit ensuite les informations client dans `pages/supplier/Clients/`.

## Synchronisation

La synchronisation repose sur deux niveaux :

1. **Source durable** : MongoDB via les APIs backend.
2. **Source UI immédiate** : `adminData.js` et les services frontend, pour mettre à jour l'interface sans attendre un rechargement complet.

Pour une donnée partagée entre plusieurs rôles, la règle est :

1. mutation par API ;
2. réponse backend normalisée ;
3. mise à jour du store frontend concerné ;
4. rechargement automatique ou abonnement local si la page est déjà ouverte.

## Règles De Cohérence

- Les données critiques viennent de MongoDB.
- Les images viennent de Cloudinary.
- Les rôles sont forcés côté serveur.
- Un supplier ne voit que ses propres produits.
- L'admin voit les données agrégées.
- Le user ne voit que les articles validés.
- Les composants UI génériques restent partagés.
- Les pages gardent leur CSS dans leur dossier.

## Où Modifier Quoi

- Ajouter une page : `frontend/src/pages/<role>/<Page>/<Page>.jsx` + `.css`, puis route dans `App.jsx`.
- Ajouter une route API : `backend/routes/`, puis constante dans `frontend/src/constants/api.js`.
- Ajouter une donnée Mongo : modèle dans `backend/models/`, route/controller, service frontend.
- Ajouter une UI réutilisable : `frontend/src/components/ui/`.
- Ajouter un bloc métier partagé : `frontend/src/components/`.
- Modifier le flux supplier : `backend/routes/supplier.js`, `services/supplier.js`, pages supplier.
- Modifier la validation admin : `backend/routes/admin.js`, pages admin.
- Modifier le catalogue user : `pages/user/Catalogue/` et données admin/supplier.

## Vérifications

Avant livraison :

```bash
cd frontend
npm run build
```

Vérifications syntaxiques backend utiles :

```bash
node --check backend/routes/admin.js
node --check backend/routes/supplier.js
node --check backend/server.js
```

Nettoyage des artefacts générés :

```bash
npm run clean
```
