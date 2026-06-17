# Cahier Des Charges ArchiPrice

Date : 2026-06-08

Ce document sert de référence fonctionnelle et technique pour comprendre ArchiPrice dans son ensemble : interfaces frontend, données manipulées, backend Express, base MongoDB, stockage Cloudinary, rôles, synchronisation et règles métier.

## 1. Objectif Du Projet

ArchiPrice est une plateforme de chiffrage, simulation et mise en relation autour de projets d'architecture et d'aménagement.

La plateforme relie trois espaces :

- **Compte user** : crée des projets, consulte le catalogue, simule un budget, exporte des récapitulatifs et contacte des boutiques.
- **Compte supplier** : gère sa boutique, crée des produits/catalogues, publie des articles à soumettre à validation admin, reçoit des clients et gère ses fichiers.
- **Compte admin** : administre les utilisateurs, fournisseurs, demandes fournisseur, articles, catégories/filtres, simulations, support et paramètres globaux.

Le système doit être dynamique : une donnée créée ou modifiée dans un espace doit être répercutée dans les autres espaces concernés via MongoDB, les APIs, les services frontend et le canal temps réel.

## 2. Rôles Et Permissions

Il existe uniquement trois rôles applicatifs :

- `user`
- `admin`
- `supplier`

### User

Un user peut :

- créer et gérer ses projets ;
- définir son budget cible ;
- consulter les articles validés dans le catalogue ;
- ajouter des articles à une simulation ;
- valider un récapitulatif ;
- exporter un PDF ;
- consulter ses estimations exportées ;
- contacter une boutique depuis le workspace ;
- envoyer un feedback au support ;
- gérer son profil.

Un user ne peut pas :

- créer des fournisseurs ;
- publier directement des articles publics ;
- modifier les données d'un autre compte ;
- accéder aux pages admin ou supplier.

### Supplier

Un supplier peut :

- accéder directement à son espace après inscription ;
- gérer le profil de sa boutique ;
- créer, modifier et supprimer ses produits ;
- uploader des fichiers/images depuis les flux prévus sans limite arbitraire côté interface admin/supplier, sous réserve des validations serveur ;
- publier un produit vers l'admin pour validation ;
- retirer une publication ;
- consulter ses fichiers ;
- consulter les clients qui l'ont contacté ;
- envoyer un feedback au support ;
- consulter les réponses admin.

Un supplier ne peut pas :

- voir les produits d'un autre supplier ;
- valider lui-même ses produits dans le catalogue public ;
- modifier les informations client ;
- accéder au compte admin.

### Admin

Un admin peut :

- gérer les utilisateurs ;
- activer, désactiver, bloquer ou masquer/supprimer des comptes selon les règles métier ;
- gérer les fournisseurs validés ;
- traiter les demandes fournisseurs ;
- valider ou refuser les articles proposés par les suppliers ;
- gérer les catégories, pièces, gammes, villes, quartiers et disponibilités ;
- consulter les simulations/estimations exportées ;
- traiter les feedbacks support ;
- gérer les paramètres admin.

Le backend ne doit jamais accepter un rôle sensible directement décidé par le frontend. Toute promotion vers `supplier` ou `admin` doit être forcée côté serveur.

## 3. Architecture Générale

Le projet est un monorepo :

```txt
archi-price/
├── backend/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   └── vite.config.js
└── docs/
```

Le backend suit une logique MVC :

- **Models** : schémas MongoDB/Mongoose dans `backend/models/`.
- **Views** : pages React dans `frontend/src/pages/`.
- **Controllers/Routes** : orchestration API dans `backend/controllers/` et `backend/routes/`.
- **Services** : logique technique réutilisable dans `backend/services/` et appels API côté frontend dans `frontend/src/services/`.

## 4. Frontend

### Organisation Par Rôle

Les pages sont séparées par rôle :

```txt
frontend/src/pages/
├── admin/
├── supplier/
└── user/
```

Chaque page doit suivre cette structure :

```txt
NomPage/
├── NomPage.jsx
└── NomPage.css
```

Les styles d'une page doivent être définis dans son fichier CSS dédié. Les composants partagés utilisent leur propre fichier CSS.

### Shells

Chaque rôle possède son layout :

- `AppShell.jsx` : compte user ;
- `AdminShell.jsx` : compte admin ;
- `SupplierShell.jsx` : compte supplier.

Les shells gèrent :

- sidebar ;
- header ;
- recherche ;
- notifications ;
- dark mode ;
- accès aux pages ;
- écoute du canal temps réel.

### Design System

Les composants génériques doivent être mutualisés dans `frontend/src/components/ui/`.

Composants attendus :

- `Button`
- `Input`
- `Select`
- `Table`
- `Modal`
- `Alert`
- `Badge`
- `Pagination`
- `Loader`
- `EmptyState`
- `ServerError`

Règle UX :

- 70 à 80% de composants partagés ;
- 20 à 30% de layout spécifique au rôle.

Les messages applicatifs doivent utiliser `Alert.jsx` ou une modale React. Les workflows ne doivent pas dépendre de `window.alert`, `window.confirm` ou `window.prompt`.

Règles `Alert.jsx` :

- durée d'affichage par défaut : 4 secondes quand un `onClose` est fourni ;
- les erreurs de formulaires et de modales doivent être affichées avec `Alert`;
- les actions de boutons dans les modales doivent déclencher un retour visuel `Alert` : sauvegarde, envoi, suppression, validation, refus, création ou modification ;
- les alertes permanentes sans `onClose` restent visibles tant que le composant parent les affiche.

## 5. Backend

### Express

Le backend expose une API REST sous `/api`.

Principaux routeurs :

- `/api/auth`
- `/api/projects`
- `/api/projects/:projectId/products`
- `/api/admin`
- `/api/supplier`
- `/api/catalogue-config`
- `/api/uploads`
- `/api/support-items`
- `/api/realtime`

### Middlewares

Middlewares importants :

- `protect` : vérifie le JWT et charge l'utilisateur courant.
- `requireAdmin` : bloque tout compte non admin.
- `requireSupplier` : bloque tout compte non supplier valide.
- `requireDb` : exige une connexion MongoDB.
- `handleMulterError` : normalise les erreurs d'upload.

### Services Backend

Services principaux :

- `cloudinaryImageService.js` : stream upload vers Cloudinary, suppression image, transformation automatique.
- `recapPdfService.js` : génération PDF en mémoire.
- `realtimeService.js` : Server-Sent Events pour synchronisation.

## 6. Base De Données MongoDB

MongoDB est la source durable des données critiques.

### Collections Principales

#### users

Stocke l'identité et l'authentification.

Champs importants :

- `name`
- `email`
- `password`
- `role`
- `status`
- `phone`
- `type`
- `createdAt`
- `updatedAt`

Règle :

- le rôle n'est pas librement modifiable depuis le frontend ;
- un supplier validé est un user avec `role: "supplier"` plus un profil métier dans `suppliers`.

#### suppliers

Stocke les données métier fournisseur.

Champs importants :

- `user`
- `name`
- `companyName`
- `email`
- `phone`
- `contact`
- `region`
- `status`
- `categories`
- `products`
- `logo`
- `coverImage`
- `approvedBy`
- `approvedAt`

Règles :

- un supplier ne voit que ses propres données ;
- un fournisseur désactivé ne peut plus gérer sa boutique ;
- un fournisseur bloqué ou supprimé ne doit plus exposer ses produits au catalogue public.

#### products

Stocke les articles et catalogues.

Champs importants :

- `name`
- `description`
- `category`
- `room`
- `range`
- `availability`
- `city`
- `neighborhood`
- `unit`
- `unitPrice`
- `supplier`
- `supplierUser`
- `images`
- `publicationStatus`
- `submittedAt`
- `approvedAt`
- `withdrawnAt`

Règles :

- les produits supplier appartiennent au supplier courant ;
- les produits supplier nouvellement créés sont des brouillons ;
- un supplier doit soumettre le produit avant que l'admin puisse le valider ;
- le catalogue user n'affiche que les produits `publicationStatus: "Validé"` et disponibles selon les règles métier ;
- les images sont stockées sur Cloudinary, pas sur le serveur.

#### projects

Stocke les projets user.

Champs importants :

- `user`
- `name`
- `description`
- `budget`
- `type`
- `status`
- `createdAt`
- `updatedAt`

Règles :

- un user ne voit que ses projets ;
- l'admin peut consulter les données agrégées selon les endpoints prévus.

#### simulations

Stocke les estimations, récapitulatifs et exports.

Champs importants :

- `user`
- `project`
- `items`
- `budgetTarget`
- `totalMin`
- `totalMax`
- `total`
- `status`
- `exportedAt`
- `createdAt`

Règle métier :

- une simulation user est considérée comme faite au clic sur `Confirmer la Validation` dans le composant `recap.jsx`.
- après validation, elle apparaît côté admin dans `Simulations`.

#### support_items

Stocke tickets, feedbacks et signalements.

Champs importants :

- `tab`
- `subject`
- `user`
- `userId`
- `sourceRole`
- `email`
- `status`
- `type`
- `description`
- `reply`
- `createdAt`
- `updatedAt`

Flux :

1. user ou supplier envoie un feedback ;
2. MongoDB crée un `SupportItem` ;
3. admin reçoit une notification ;
4. admin répond ;
5. user ou supplier reçoit une notification ;
6. le destinataire peut masquer la réponse de sa liste sans supprimer l'audit admin.

## 7. Gestion Des Images Et Fichiers

### Cloudinary

Les images produits sont stockées sur Cloudinary dans :

```txt
archiprice/products
```

MongoDB stocke uniquement :

- `secure_url`
- `public_id`
- `metadata`
- dimensions, format, taille si disponibles.

Le serveur ne stocke aucun fichier local temporaire.

### Upload Produits

Règles :

- les interfaces admin/supplier ne doivent pas imposer une limite arbitraire de nombre de fichiers ;
- pour les produits : images uniquement ;
- formats produit autorisés : JPG, PNG, WebP ;
- taille max image produit : 5 Mo ;
- upload via `multer.memoryStorage()` ;
- stream direct vers Cloudinary ;
- suppression Cloudinary lors de la suppression d'une image ou d'un produit.

### Page Supplier Fichiers

La page supplier `Fichiers` peut accepter plusieurs types de fichiers côté interface :

- images ;
- vidéos ;
- documents ;
- autres fichiers locaux.

La page inclut un bouton `Réinitialiser` qui vide la liste affichée :

- les fichiers locaux sélectionnés sont retirés de l'état frontend ;
- les images produits déjà uploadées sont supprimées via les endpoints supplier prévus ;
- l'action affiche une confirmation puis un retour visuel avec `Alert.jsx`.

Les fichiers locaux affichés dans cette page ne deviennent durables que s'ils sont rattachés à un flux backend prévu.

## 8. Flux Des Données Par Domaine

### Authentification

1. React appelle `services/auth.js`.
2. `auth.js` appelle `/api/auth/login` ou `/api/auth/register`.
3. Express valide le payload.
4. MongoDB lit ou crée un `User`.
5. Le backend retourne `{ token, user }`.
6. `AuthContext` conserve l'utilisateur courant.
7. Le frontend redirige selon le rôle.

### Seed Super Admin

Au premier démarrage du backend avec MongoDB connecté, le serveur exécute `backend/seeds/superAdmin.js`.

Objectif :

- éviter une plateforme sans accès admin quand la collection `users` est vide ;
- créer un compte administrateur initial configurable par variables d'environnement.

Variables :

```env
SUPER_ADMIN_EMAIL=admin@archiprice.com
SUPER_ADMIN_PASSWORD=Admin123!
SUPER_ADMIN_FIRSTNAME=Super
SUPER_ADMIN_LASTNAME=Admin
```

Implémentation actuelle :

- le compte est créé avec `role: "admin"` pour rester compatible avec les guards admin existants ;
- le champ `type` vaut `"Super Admin"` ;
- le statut vaut `"Actif"` ;
- le mot de passe est hashé par le hook Mongoose du modèle `User`.

Le seed est idempotent :

- si un utilisateur `role: "admin"` existe déjà, aucun compte n'est recréé ;
- si MongoDB n'est pas connecté, le seed est ignoré.

### Inscription Supplier

1. Le visiteur choisit le type fournisseur.
2. Le backend crée un compte user avec `role: "supplier"`.
3. Un document `Supplier` est créé ou lié.
4. Le fournisseur accède directement à `/supplier/dashboard`.

### Catalogue Admin Vers User

1. L'admin configure les catégories, pièces, gammes, villes, quartiers et disponibilités.
2. Ces données alimentent `catalogue-config`.
3. Les formulaires admin et supplier lisent ces taxonomies.
4. Le catalogue user affiche les filtres seulement si des articles validés existent.
5. Si aucune donnée catalogue n'existe, le panel de filtres ne doit pas s'afficher.

### Produit Supplier Vers Catalogue Public

1. Supplier crée un produit dans `/supplier/products/new`.
2. React construit un `FormData` avec champs texte et images.
3. Backend valide ownership et fichiers.
4. Images envoyées vers Cloudinary.
5. Product créé dans MongoDB avec `supplier` et `supplierUser`.
6. Product créé avec `publicationStatus: "Brouillon"`.
7. Supplier publie le produit depuis `/supplier/products`.
8. Backend passe le produit en `publicationStatus: "En attente"`.
9. Admin reçoit l'article dans `Articles`.
10. Admin valide, retire, refuse ou supprime.
11. Si validé, le produit devient visible dans le catalogue user via `/api/catalogue/products`.

### Simulation User Vers Admin

1. User crée un projet.
2. User ajoute des articles depuis le catalogue.
3. La simulation budget live calcule les montants.
4. User clique sur `Confirmer la Validation`.
5. Le récapitulatif est enregistré.
6. L'export PDF peut être généré.
7. L'estimation apparaît dans `Invoices` côté user.
8. La même estimation apparaît dans `Simulations` côté admin.

Règle de synchronisation admin :

- `/api/admin/simulations` agrège les documents `Simulation` et les projets MongoDB créés dans le Workspace ;
- un projet créé dans `Workspace` doit donc apparaître côté admin même avant export PDF, avec un statut cohérent (`En cours` ou `Succès` selon l'état du projet) ;
- les exports validés restent visibles comme simulations/estimations complètes avec articles et liens Cloudinary.

### Workspace User Vers Clients Supplier

1. User ouvre son workspace.
2. Il clique sur `Où acheter`.
3. Le modal affiche les fournisseurs validés.
4. User sélectionne une boutique.
5. Une notification client est créée pour le supplier.
6. Le supplier voit le client dans `Clients`.
7. Le détail client peut afficher les articles choisis et les liens Cloudinary associés.

### Support Et Notifications

1. User ou supplier envoie un feedback depuis sa page Support.
2. Frontend appelle `/api/support-items`.
3. Backend crée un `SupportItem`.
4. Backend publie un événement realtime `support-items:created` pour admin.
5. Admin voit le feedback dans la page Support.
6. Admin répond via `PATCH /api/admin/support-items/:id`.
7. Backend publie `support-items:updated`.
8. User ou supplier reçoit la notification de réponse.
9. Le destinataire peut supprimer/masquer la réponse de sa liste locale sans effacer le document MongoDB.

Règles d'affichage :

- les pages `Support` user et supplier affichent la liste personnelle des feedbacks créés via `/api/support-items/me` ;
- chaque feedback est cliquable et ouvre le même modal de détail que le support admin, en lecture seule côté user/supplier ;
- un feedback masqué côté user/supplier ne supprime pas l'entrée MongoDB ;
- la page `Support` admin reprend le même format visuel que les pages Support user/supplier, avec actions de réponse et suppression.

### Demandes Et Conversations Boutique

Les pages `Demande` user et `Demandesup` supplier sont le système de conversation entre un particulier et une boutique.

Flux :

1. Le user démarre une demande depuis le modal `Où acheter`.
2. Une notification `type: "Demande"` est ajoutée à `supplierClientNotifications`.
3. La page `Demande` du user affiche les conversations groupées par boutique.
4. La page `Demandesup` du supplier affiche les conversations groupées par client/projet/boutique.
5. Les messages user sont alignés côté user, les messages supplier côté supplier selon le rôle de l'émetteur.
6. Chaque conversation est une ligne cliquable ; le détail s'ouvre dans un modal de chat.
7. Les actions `Répondre`, `Envoyer`, `Supprimer de ma liste` utilisent `Alert.jsx`.

Règles :

- les doublons doivent être dédupliqués par identifiant de conversation et contenu de message ;
- masquer une conversation côté user ou supplier est local à ce compte ;
- la conversation reste disponible pour l'autre partie tant que la source métier existe.

## 9. Synchronisation Temps Réel

La synchronisation repose sur trois couches :

### 1. MongoDB

Source de vérité durable.

Toute donnée critique doit finir dans MongoDB :

- utilisateurs ;
- fournisseurs ;
- produits ;
- projets ;
- simulations ;
- support ;
- demandes fournisseur.

### 2. Services Frontend

Les fichiers dans `frontend/src/services/` sont la couche d'accès aux données.

Ils doivent :

- centraliser les appels API ;
- normaliser les réponses ;
- notifier les stores locaux si nécessaire ;
- éviter les appels directs dispersés dans les composants.

Services importants :

- `api.js`
- `auth.js`
- `adminMongo.js`
- `adminData.js`
- `supplier.js`
- `support.js`
- `projects.js`
- `products.js`
- `catalogueImages.js`
- `realtime.js`

### 3. Realtime SSE

Le backend expose `/api/realtime`.

Les shells `AppShell`, `AdminShell` et `SupplierShell` écoutent ce canal.

Le backend publie des événements après les mutations :

- création utilisateur ;
- modification fournisseur ;
- produit supplier ;
- support ;
- simulation ;
- configuration catalogue.

Règle :

1. mutation par API ;
2. écriture MongoDB ;
3. réponse API ;
4. publication realtime ;
5. rafraîchissement des pages concernées.

## 10. Règles D'État Des Comptes

### Désactiver

But : retirer temporairement l'accès sans supprimer les données.

Impact user :

- connexion interdite ou limitée selon middleware ;
- création de projets bloquée ;
- simulations conservées ;
- historique conservé.

Impact supplier :

- connexion interdite ou limitée ;
- modification produits bloquée ;
- ajout de produits bloqué ;
- produits existants conservés.

### Bloquer / Suspendre

But : sanction plus sévère.

Impact user :

- connexion interdite ;
- accès API interdit ;
- données conservées ;
- historique conservé.

Impact supplier :

- connexion interdite ;
- publication interdite ;
- produits masqués du catalogue public ;
- produits exclus des nouvelles simulations ;
- historique conservé.

### Supprimer / Masquer

But : retirer l'entité de l'interface standard tout en conservant l'audit.

Impact user :

- connexion impossible ;
- compte invisible dans les listes standard ;
- données conservées.

Impact supplier :

- catalogue masqué ;
- produits non disponibles ;
- anciennes simulations conservées.

## 11. Règles UI Et UX

### One Page Et Scroll

Les interfaces de chaque compte doivent éviter les scrolls inutiles. Quand un scroll est nécessaire, il doit être interne à la zone de contenu, pas horizontal.

Règles globales :

- `overflow-x: hidden` au layout racine ;
- médias avec `max-width: 100%` ;
- pas de débordement horizontal ;
- les tables doivent être lisibles et responsives.

### Dark Mode

Le dark mode doit passer par les variables CSS `--app-*`.

Les pages et composants doivent éviter les couleurs fixes quand elles cassent le thème.

### Modales

Les modales doivent être de vrais composants React, pas des alertes navigateur.

Elles doivent inclure :

- titre ;
- bouton close ;
- champs clairs ;
- actions `Annuler`, `Enregistrer`, `Envoyer`, etc. ;
- validation required si nécessaire ;
- gestion d'erreur via `Alert`.
- confirmation de succès via `Alert` pour les boutons d'action principaux.

### Tables Et Listes Cliquables

Les pages admin et supplier privilégient les listes cliquables avec détail en modal/page secondaire :

- Fournisseurs ;
- Nouvelles demandes ;
- Utilisateurs ;
- Simulations ;
- Support ;
- Catégories/filtres ;
- Clients.

## 12. Règles De Sécurité

- JWT obligatoire pour les routes protégées.
- Les rôles sont contrôlés côté serveur.
- Le supplier ne peut accéder qu'à ses produits.
- Les uploads passent par validation MIME et taille.
- Les secrets Cloudinary restent côté backend.
- MongoDB ne stocke pas les fichiers binaires.
- Les suppressions métier doivent préserver l'audit si demandé par les règles fonctionnelles.

## 13. Endpoints Importants

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Admin

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/suppliers`
- `POST /api/admin/suppliers`
- `PUT /api/admin/suppliers/:id`
- `DELETE /api/admin/suppliers/:id`
- `GET /api/admin/simulations`
- `GET /api/admin/support-items`
- `PATCH /api/admin/support-items/:id`

### Supplier

- `GET /api/supplier/me`
- `PUT /api/supplier/me`
- `GET /api/supplier/workspace`
- `GET /api/supplier/products`
- `POST /api/supplier/products`
- `PUT /api/supplier/products/:productId`
- `DELETE /api/supplier/products/:productId`
- `DELETE /api/supplier/products/:productId/images`

### User

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/:id/recap.pdf`
- `GET /api/projects/:projectId/products`
- `POST /api/projects/:projectId/products`
- `PUT /api/projects/:projectId/products/:id`
- `DELETE /api/projects/:projectId/products/:id`

### Support

- `GET /api/support-items/me`
- `POST /api/support-items`
- `GET /api/admin/support-items`
- `PATCH /api/admin/support-items/:id`
- `DELETE /api/admin/support-items/:id`

### Uploads

- `POST /api/uploads/products/images`
- `DELETE /api/uploads/products/images`

## 14. Données Frontend Et Stores

### adminData.js

`adminData.js` sert de couche de synchronisation frontend historique et de fallback UI.

Il contient notamment :

- taxonomies ;
- fournisseurs ;
- support ;
- notifications client supplier ;
- paramètres supplier/admin selon les flux existants.

Règle :

- si une donnée est critique et partagée entre navigateurs, elle doit être persistée par API/MongoDB ;
- les produits/articles catalogue ne doivent plus être persistés dans `adminData.products` ;
- `adminData.products` est purgé/ignoré pour éviter les données statiques persistantes ;
- `adminData.js` ne doit pas devenir la seule source de vérité durable.

### adminMongo.js

`adminMongo.js` contient les appels admin vers MongoDB :

- users ;
- suppliers ;
- products/articles supplier ;
- simulations ;
- support.

Règle :

- les pages admin doivent privilégier `adminMongo.js` pour les données Mongo ;
- `adminData.js` peut compléter pour les états UI immédiats.

### supplier.js

`supplier.js` gère :

- profil supplier ;
- workspace supplier ;
- produits supplier ;
- images de produits ;
- notification locale de changement supplier.

### support.js

`support.js` gère :

- feedback user/supplier ;
- liste personnelle des messages support.

## 15. Critères D'Acceptation

Le workspace est considéré cohérent si :

- un user, admin et supplier peuvent se connecter selon leur rôle ;
- un supplier accède directement à son espace ;
- un produit supplier créé avec images apparaît côté supplier ;
- la proposition de publication arrive côté admin ;
- après validation admin, le produit apparaît côté user catalogue ;
- le user peut simuler, valider un récapitulatif et exporter un PDF ;
- la simulation validée apparaît côté admin ;
- un user/supplier peut envoyer un feedback ;
- l'admin reçoit une notification et peut répondre ;
- le destinataire reçoit la réponse ;
- les uploads produit valident le type et la taille des images sans limite arbitraire côté interface admin/supplier ;
- la page Fichiers permet de vider/réinitialiser la liste complète ;
- les dark/light themes restent lisibles ;
- les données critiques survivent à un changement de navigateur.

## 16. Vérifications Techniques

Frontend :

```bash
cd frontend
npm run lint
npm run build
```

Backend :

```bash
node --check backend/routes/admin.js
node --check backend/routes/supplier.js
node --check backend/routes/uploads.js
node --check backend/routes/supportItems.js
node --check backend/server.js
```

Santé API :

```bash
curl -s http://localhost:5000/api/health
```

MongoDB doit retourner un état connecté.

## 17. Règles De Maintenance

- Ne pas dupliquer une limite métier dans plusieurs fichiers sans constante partagée.
- Ne pas créer une donnée critique uniquement dans `localStorage`.
- Ne pas contourner les services frontend par des appels API dispersés.
- Ne pas stocker de base64 image en MongoDB.
- Ne pas introduire une page sans CSS dédié.
- Ne pas ajouter de rôle sans mettre à jour backend, frontend, guards, docs et permissions.
- Ne pas casser le canal temps réel : toute mutation partagée doit publier un événement.
- Préserver les données utilisateur et fournisseur lors des actions de blocage/masquage.
