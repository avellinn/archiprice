# SOUS LE CAPO

Document de reference technique du workspace ArchiPrice.

Ce document explique le role des fichiers structurants du backend et du frontend, les fonctions principales, la difference entre `App.css` et `index.css`, ainsi que le role des dependances. Il sert de carte de navigation pour comprendre le projet sans devoir ouvrir tous les fichiers un par un.

## Vue D'ensemble

ArchiPrice est organise comme un monorepo JavaScript avec deux applications principales :

- `backend/` : API Express, connexion MongoDB avec Mongoose, authentification JWT, upload Cloudinary, support temps reel via Server-Sent Events, email de reset password, routes admin/user/supplier.
- `frontend/` : application React/Vite, routage par role, shells dedies admin/user/supplier, services API Axios, contexte d'authentification, pages metier.

Le point d'entree frontend est `frontend/src/main.jsx`.
Le point d'entree backend est `backend/server.js`.

## Backend

### Point D'entree

| Fichier | Role |
|---|---|
| `backend/server.js` | Demarre le serveur HTTP, connecte MongoDB, seed le super admin, gere l'arret propre avec `SIGINT` et `SIGTERM`. |
| `backend/app.js` | Cree l'application Express, applique CORS, JSON parser, logger HTTP, monte `/api`, gere 404 et erreurs globales. |
| `backend/routes/index.js` | Routeur central qui branche toutes les routes API sous `/api`. |
| `backend/package.json` | Declare scripts backend et dependances serveur. |
| `backend/nodemon.json` | Configuration de dev pour redemarrage automatique du backend. |

### Configs

| Fichier | Role |
|---|---|
| `backend/config/env.js` | Charge les fichiers `.env` possibles depuis la racine ou `backend/`. Expose `requireEnv(name)` pour forcer une variable obligatoire. |
| `backend/config/db.js` | Connexion, statut, verification et deconnexion MongoDB. Cree les collections coeur si besoin. |
| `backend/config/cloudinary.js` | Configure Cloudinary depuis l'environnement et expose un garde-fou de configuration. |

Fonctions repertoriees :

| Fonction | Emplacement | Role |
|---|---|---|
| `requireEnv(name)` | `backend/config/env.js` | Lit une variable d'environnement et leve une erreur si elle manque. |
| `isProduction()` | `backend/config/db.js` | Determine si l'environnement est en production. |
| `statusFromReadyState(readyState)` | `backend/config/db.js` | Convertit l'etat Mongoose en statut lisible. |
| `connectDB()` | `backend/config/db.js` | Ouvre la connexion MongoDB. |
| `ensureCoreCollections()` | `backend/config/db.js` | S'assure que les collections essentielles existent. |
| `getDbStatus()` | `backend/config/db.js` | Retourne le statut courant de la DB. |
| `disconnectDB()` | `backend/config/db.js` | Ferme proprement MongoDB. |
| `assertCloudinaryConfig()` | `backend/config/cloudinary.js` | Verifie que Cloudinary est correctement configure. |

### Models

Les models Mongoose definissent la structure de donnees et les comportements de stockage.

| Fichier | Role |
|---|---|
| `backend/models/User.js` | Compte applicatif. Porte les roles `user`, `supplier`, `admin`, le statut, les infos profil et le hash password. |
| `backend/models/Supplier.js` | Profil boutique/fournisseur lie a un user supplier. Stocke nom, contact, categories, region, statut, recommandation, visuels. |
| `backend/models/Project.js` | Projet cree par un user dans le workspace. Sert de base aux simulations et recaps. |
| `backend/models/Product.js` | Article rattache a un projet ou publie par supplier. Inclut prix, images, categorie, fournisseur, localisation et cycle de publication (`Brouillon`, `En attente`, `Valide`, `Retire`, `Refuse`). |
| `backend/models/Simulation.js` | Simulation admin/user. Utilisee pour representer ou historiser des travaux de simulation. |
| `backend/models/SupportItem.js` | Feedback/support utilisateur, supplier ou admin. |
| `backend/models/PasswordResetToken.js` | Jetons de reset password hashes, dates d'expiration, consommation. |
| `backend/models/Demande.js` | Conversations/chats entre user et supplier. Centralise les demandes et messages. |

Bonnes pratiques appliquees ici :

- Les mots de passe ne doivent jamais etre stockes en clair.
- Les tokens de reset password sont hashes avant stockage.
- Les suppressions critiques doivent etre pensees avec cascade quand une entite parent disparait.
- Les images distantes gardent leur `public_id` pour permettre la suppression Cloudinary.

### Controllers

Les controllers portent la logique HTTP metier des routes classiques.

| Fichier | Role |
|---|---|
| `backend/controllers/authController.js` | Inscription, login, profil courant, modification profil, changement password, reset password, creation profil supplier. |
| `backend/controllers/projectController.js` | CRUD projets user. |
| `backend/controllers/productController.js` | CRUD produits de projet et suppression image produit. |
| `backend/controllers/uploadController.js` | Upload et suppression d'images catalogue. |
| `backend/controllers/recapController.js` | Generation et telechargement PDF recap projet. |

Fonctions repertoriees :

| Fonction | Emplacement | Role |
|---|---|---|
| `hashResetToken(token)` | `authController.js` | Hash SHA-256 d'un token de reset. |
| `getRedirectTo(role)` | `authController.js` | Retourne la destination apres login selon role. |
| `formatUser(user)` | `authController.js` | Normalise un user pour la reponse API. |
| `normalizeCategories(categories)` | `authController.js` | Nettoie une liste de categories supplier. |
| `ensureSupplierProfile(user, payload)` | `authController.js` | Cree ou synchronise le profil supplier lie au compte. |
| `sendAuthResponse(res, user, statusCode)` | `authController.js` | Genere JWT et reponse user. |
| `register(req, res)` | `authController.js` | Cree un compte user ou supplier. |
| `updateMe(req, res)` | `authController.js` | Met a jour le profil connecte. |
| `changePassword(req, res)` | `authController.js` | Change le mot de passe du compte courant. |
| `forgotPassword(req, res)` | `authController.js` | Genere token reset et declenche l'email. |
| `resetPassword(req, res)` | `authController.js` | Valide token et remplace le mot de passe. |
| `login(req, res)` | `authController.js` | Authentifie email/password et renvoie JWT. |
| `getMe(req, res)` | `authController.js` | Retourne l'utilisateur courant. |
| `formatProject(project)` | `projectController.js` | Normalise un projet pour le front. |
| `isValidObjectId(id)` | `projectController.js`, `productController.js`, `recapController.js` | Valide un id MongoDB. |
| `getProjects(req, res)` | `projectController.js` | Liste les projets de l'utilisateur. |
| `createProject(req, res)` | `projectController.js` | Cree un projet. |
| `updateProject(req, res)` | `projectController.js` | Met a jour un projet. |
| `deleteProject(req, res)` | `projectController.js` | Supprime un projet. |
| `findOwnedProject(projectId, userId)` | `productController.js` | Verifie qu'un projet appartient au user. |
| `formatProduct(product)` | `productController.js` | Normalise un produit pour le front. |
| `getProducts(req, res)` | `productController.js` | Liste les produits d'un projet. |
| `createProduct(req, res)` | `productController.js` | Cree un produit projet. |
| `updateProduct(req, res)` | `productController.js` | Met a jour un produit projet. |
| `deleteProduct(req, res)` | `productController.js` | Supprime un produit projet. |
| `deleteProductImageByPublicId(req, res)` | `productController.js` | Supprime une image produit via `public_id`. |
| `uploadImages(req, res)` | `uploadController.js` | Upload plusieurs images vers Cloudinary. |
| `deleteImage(req, res)` | `uploadController.js` | Supprime une image Cloudinary. |
| `getSafeFileName(value)` | `recapController.js` | Nettoie un nom de fichier PDF. |
| `downloadProjectRecapPdf(req, res)` | `recapController.js` | Genere et envoie le PDF recap. |

### Routes

Les routes assemblent middlewares, controllers et logique HTTP particuliere.

| Fichier | Role |
|---|---|
| `backend/routes/health.js` | Healthcheck API/DB. |
| `backend/routes/auth.js` | Routes `/auth/register`, `/auth/login`, `/auth/me`, password reset. |
| `backend/routes/projects.js` | CRUD projets connectes. |
| `backend/routes/products.js` | CRUD produits dans un projet. |
| `backend/routes/admin.js` | Routes admin pour users, suppliers, articles supplier, simulations, support, catalogue config. |
| `backend/routes/catalogueConfig.js` | Lecture/ecriture de la configuration catalogue dynamique et exposition des articles valides du catalogue user. |
| `backend/routes/uploads.js` | Upload/suppression d'images catalogue. |
| `backend/routes/supplier.js` | Workspace supplier, profil boutique, produits supplier, images supplier. |
| `backend/routes/realtime.js` | Connexion SSE temps reel. |
| `backend/routes/supportItems.js` | Support/feedback du compte connecte. |

Fonctions importantes dans les routes :

| Fonction | Emplacement | Role |
|---|---|---|
| `normalizeRole`, `roleFromType`, `typeFromRole` | `routes/admin.js` | Conversion propre role/type pour admin. |
| `formatAdminUser` | `routes/admin.js` | Normalise un user pour la page admin utilisateurs. |
| `formatDocument` | `routes/admin.js`, `routes/supportItems.js` | Convertit un document Mongoose en objet API. |
| `parseProjectBudget` | `routes/admin.js` | Extrait budget depuis description projet. |
| `formatProjectAsSimulation` | `routes/admin.js` | Transforme un projet en simulation admin. |
| `formatAdminSupplier` | `routes/admin.js` | Normalise un supplier pour l'admin. |
| `ensureSupplierProfile` | `routes/admin.js` | Garantit un profil supplier lors de synchronisations admin. |
| `deleteProductsWithImages` | `routes/admin.js` | Supprime produits et images Cloudinary associees. |
| `getProductImage` | `routes/admin.js` | Recupere l'image principale d'un produit supplier. |
| `formatAdminProduct` | `routes/admin.js` | Normalise un produit supplier pour la page admin Articles. |
| `deleteUserCascade` | `routes/admin.js` | Supprime les donnees liees a un user. |
| `isLegacyStaticItem` | `routes/catalogueConfig.js` | Detecte les anciennes donnees statiques. |
| `stripLegacyStaticItems` | `routes/catalogueConfig.js` | Retire les anciennes valeurs statiques. |
| `sanitizeProfile` | `routes/catalogueConfig.js` | Nettoie profil admin catalogue. |
| `sanitizeSettings` | `routes/catalogueConfig.js` | Nettoie settings catalogue. |
| `sanitizeAccountSettings` | `routes/catalogueConfig.js` | Nettoie settings de compte. |
| `sanitizeTaxonomies` | `routes/catalogueConfig.js` | Nettoie taxonomies admin. |
| `sanitizeCatalogueConfig` | `routes/catalogueConfig.js` | Normalise toute la config catalogue. |
| `formatCatalogueProduct` | `routes/catalogueConfig.js` | Normalise un produit valide pour le catalogue user. |
| `readCatalogueConfig` | `routes/catalogueConfig.js` | Lit la config catalogue stockee. |
| `writeCatalogueConfig` | `routes/catalogueConfig.js` | Persiste la config catalogue. |
| `formatSupplier` | `routes/supplier.js` | Normalise profil supplier. |
| `formatProduct` | `routes/supplier.js` | Normalise produit supplier. |
| `parsePrice` | `routes/supplier.js` | Convertit prix texte en nombre. |
| `findOrCreateSupplierProfile` | `routes/supplier.js` | Cree/recupere le profil supplier. |
| `findSupplierProducts` | `routes/supplier.js` | Liste les produits d'un supplier. |

### Services

Les services isolent les integrations et traitements transversaux.

| Fichier | Role |
|---|---|
| `backend/services/cloudinaryImageService.js` | Upload buffer vers Cloudinary, URL optimisee, document image, suppression. |
| `backend/services/emailService.js` | Configuration SMTP, verification transport, envoi reset password. |
| `backend/services/realtimeService.js` | Clients SSE, ciblage par role/user, publication evenements. |
| `backend/services/recapPdfService.js` | Generation PDF sans dependance externe. |

Fonctions repertoriees :

| Fonction | Emplacement | Role |
|---|---|---|
| `buildOptimizedUrl(publicId)` | `cloudinaryImageService.js` | Construit une URL Cloudinary optimisee. |
| `uploadBufferToCloudinary(file, options)` | `cloudinaryImageService.js` | Stream upload d'un buffer image. |
| `toImageDocument(result, file)` | `cloudinaryImageService.js` | Convertit le resultat Cloudinary en document image. |
| `uploadProductImages(files, options)` | `cloudinaryImageService.js` | Upload plusieurs images produit. |
| `deleteProductImage(publicId)` | `cloudinaryImageService.js` | Supprime une image Cloudinary. |
| `getFirstEnv(names)` | `emailService.js` | Lit la premiere variable d'environnement disponible. |
| `getSmtpConfig()` | `emailService.js` | Construit la config SMTP. |
| `getMissingConfigKeys(config)` | `emailService.js` | Liste les variables SMTP manquantes. |
| `getTransporter()` | `emailService.js` | Cree le transport Nodemailer. |
| `sendPasswordResetEmail(...)` | `emailService.js` | Envoie l'email de reset password. |
| `normalizeId(value)` | `realtimeService.js` | Normalise un id pour comparaison. |
| `writeSse(res, payload)` | `realtimeService.js` | Ecrit un evenement SSE. |
| `matchesTarget(client, targets)` | `realtimeService.js` | Verifie si un client doit recevoir un evenement. |
| `addRealtimeClient(req, res)` | `realtimeService.js` | Enregistre une connexion SSE. |
| `publishRealtimeEvent(event, targets)` | `realtimeService.js` | Publie un evenement temps reel. |
| `publishCrudEvent(entity, action, payload, targets)` | `realtimeService.js` | Publie un evenement CRUD standardise. |
| `generateProjectRecapPdf({ project, products, user })` | `recapPdfService.js` | Genere le PDF recap final. |

Le service PDF contient aussi des helpers internes : `stripDiacritics`, `sanitizePdfText`, `escapePdfText`, `parseAmount`, `formatFCFA`, `extractProjectMetadata`, `getProjectReference`, `wrapText`, `textCommand`, `getImageUrl`, `getProductImageUrl`, `lineCommand`, `rectCommand`, `fillRectCommand`, `buildPageContent`, `chunkProducts`, `buildPdf`.

### Middlewares

| Fichier | Role |
|---|---|
| `backend/middleware/auth.js` | Protection JWT et restriction par role. |
| `backend/middleware/errorHandler.js` | Gestion 404 et erreurs centralisees. |
| `backend/middleware/multerUpload.js` | Upload en memoire, validation type/taille, erreurs Multer. |
| `backend/middleware/requestLogger.js` | Log HTTP simple de chaque requete. |
| `backend/middleware/requireDb.js` | Bloque une requete si MongoDB n'est pas connecte. |

Fonctions :

| Fonction | Emplacement | Role |
|---|---|---|
| `protect(req, res, next)` | `middleware/auth.js` | Verifie JWT, charge user, bloque comptes invalides. |
| `requireRole(role)` | `middleware/auth.js` | Restreint une route a un role. Pour `supplier`, verifie aussi l'existence d'un profil `Supplier` non supprime. |
| `notFound(_req, res)` | `middleware/errorHandler.js` | Reponse 404 JSON. |
| `errorHandler(err, req, res, _next)` | `middleware/errorHandler.js` | Reponse erreur JSON centralisee. |
| `handleMulterError(err, _req, res, next)` | `middleware/multerUpload.js` | Traduit les erreurs d'upload. |
| `requestLogger(req, res, next)` | `middleware/requestLogger.js` | Journalise les requetes. |
| `requireDb(_req, res, next)` | `middleware/requireDb.js` | Exige une connexion DB prete. |

### Utils Et Seeds

| Fichier | Role |
|---|---|
| `backend/utils/asyncHandler.js` | Wrapper pour propager les erreurs async Express. |
| `backend/utils/generateToken.js` | Generation JWT. |
| `backend/seeds/superAdmin.js` | Creation du compte super admin depuis `.env`. |

Fonctions :

| Fonction | Emplacement | Role |
|---|---|---|
| `asyncHandler(fn)` | `utils/asyncHandler.js` | Evite les `try/catch` repetes dans routes async. |
| `generateToken(userId, role)` | `utils/generateToken.js` | Cree un JWT avec id et role. |
| `getSuperAdminConfig()` | `seeds/superAdmin.js` | Lit les infos admin initial. |

## Frontend

### Entrypoints Et Routage

| Fichier | Role |
|---|---|
| `frontend/src/main.jsx` | Monte React dans `#root`, active `StrictMode`, englobe l'app dans `AuthProvider`. |
| `frontend/src/App.jsx` | Declare toutes les routes user, supplier et admin. Applique `GuestRoute`, `ProtectedRoute`, `SupplierRoute`, `AdminRoute`. |
| `frontend/src/config/env.js` | Centralise l'URL API via `getApiBaseUrl()`. |

Le composant `Logo.jsx` n'existe plus. Les layouts importent directement `frontend/src/assets/images/log.png`. Les styles du logo vivent dans les CSS des conteneurs actifs : `Sidebar.css`, `Header.css` et `AuthLayout.css`.

### Constants

| Fichier | Role |
|---|---|
| `frontend/src/constants/api.js` | Carte de toutes les routes API consommees par le front. |
| `frontend/src/constants/storage.js` | Cle du token localStorage. |
| `frontend/src/constants/uploads.js` | Limite image et libelle upload. |

Exports :

| Export | Emplacement | Role |
|---|---|---|
| `API_ROUTES` | `constants/api.js` | Evite les URL API ecrites en dur. |
| `TOKEN_KEY` | `constants/storage.js` | Cle locale du JWT. |
| `UPLOAD_LIMIT_LABEL` | `constants/uploads.js` | Libelle UI pour upload. |

### Context

| Fichier | Role |
|---|---|
| `frontend/src/context/AuthContext.jsx` | Provider d'authentification, charge user courant, login/logout/register, sync token. |
| `frontend/src/context/authContext.js` | Objet contexte React partage. |
| `frontend/src/context/useAuth.js` | Hook pour consommer le contexte. |

Fonctions :

| Fonction | Emplacement | Role |
|---|---|---|
| `withSessionAvatarColor(userData, shouldRefresh)` | `AuthContext.jsx` | Ajoute couleur avatar stable par session. |
| `AuthProvider({ children })` | `AuthContext.jsx` | Fournit user, token, actions auth. |
| `useAuth()` | `useAuth.js` | Hook d'acces au contexte auth. |

### Services

Les services frontend isolent les appels API et les fallback localStorage. Ils evitent que les pages connaissent Axios directement.

| Fichier | Role |
|---|---|
| `frontend/src/services/api.js` | Instance Axios, baseURL, injection JWT, interception 401/403, helper erreur. |
| `frontend/src/services/auth.js` | Register, login, me, update profil, changement password, reset password. |
| `frontend/src/services/adminMongo.js` | API admin pour users, suppliers, articles supplier, simulations, support. |
| `frontend/src/services/adminData.js` | Store admin local/synchronise, taxonomies, nettoyage legacy. `products` est purge pour ne plus alimenter le catalogue. |
| `frontend/src/services/catalogueProducts.js` | Lecture des articles valides exposes dans le catalogue user. |
| `frontend/src/services/exportedDocuments.js` | Archives/documents exportes en localStorage scope. |
| `frontend/src/services/products.js` | Produits de projet, avec fallback localStorage. |
| `frontend/src/services/projects.js` | Projets workspace, avec fallback localStorage et events. |
| `frontend/src/services/realtime.js` | Connexion SSE et diffusion locale d'evenements. |
| `frontend/src/services/scopedStorage.js` | Cle localStorage scopee par utilisateur JWT. |
| `frontend/src/services/supplier.js` | Workspace supplier, profil, produits, images, notifications locales. |
| `frontend/src/services/support.js` | Support/feedback du compte courant. |

Fonctions exportees importantes :

| Fonction | Emplacement | Role |
|---|---|---|
| `setUnauthorizedHandler` | `api.js` | Branche une action globale quand API renvoie 401/403. |
| `getApiErrorMessage` | `api.js` | Extrait un message erreur lisible. |
| `getStoredToken`, `setStoredToken` | `auth.js` | Lit/ecrit le JWT local. |
| `register`, `login`, `fetchMe`, `updateMe`, `changePassword` | `auth.js` | Operations auth/profil. |
| `requestPasswordReset`, `resetPassword` | `auth.js` | Flux mot de passe oublie. |
| `fetchAdminUsers`, `createAdminUser`, `updateAdminUser`, `deleteAdminUser` | `adminMongo.js` | CRUD utilisateurs admin. |
| `fetchAdminSuppliers`, `createAdminSupplier`, `updateAdminSupplier`, `deleteAdminSupplier` | `adminMongo.js` | CRUD fournisseurs admin. |
| `fetchAdminProducts`, `updateAdminProduct`, `deleteAdminProduct` | `adminMongo.js` | Liste, validation/retrait et suppression des articles supplier. |
| `fetchAdminSimulations`, `updateAdminSimulation` | `adminMongo.js` | Synchronisation simulations admin. |
| `fetchAdminSupportItems`, `updateAdminSupportItem`, `deleteAdminSupportItem` | `adminMongo.js` | Support admin. |
| `getAdminData`, `saveAdminData`, `useAdminData` | `adminData.js` | Lecture/ecriture/reactivité du store admin. |
| `fetchRemoteAdminData`, `saveRemoteAdminData`, `syncAdminDataFromRemote` | `adminData.js` | Synchronisation remote catalogue config. |
| `fetchCatalogueProducts` | `catalogueProducts.js` | Charge uniquement les articles valides visibles cote user. |
| `fetchExportedDocuments`, `addExportedDocument`, `removeExportedDocument`, `subscribeExportedDocumentsChange` | `exportedDocuments.js` | Archives/documents exportes. |
| `fetchProjects`, `createProject`, `updateProject`, `deleteProject`, `downloadProjectRecapPdf` | `projects.js` | Workspace projets. |
| `fetchProducts`, `createProduct`, `updateProduct`, `deleteProduct` | `products.js` | Articles rattaches aux projets. |
| `connectRealtime` | `realtime.js` | Connexion SSE authentifiee. |
| `getCurrentStorageScope`, `getScopedStorageKey` | `scopedStorage.js` | Isolation localStorage par compte. |
| `fetchSupplierWorkspace`, `fetchSupplierProfile`, `fetchSupplierProducts` | `supplier.js` | Lecture espace supplier. |
| `updateSupplierProfile`, `createSupplierProduct`, `updateSupplierProduct`, `updateSupplierProductPublication`, `deleteSupplierProduct`, `deleteSupplierProductImage` | `supplier.js` | Ecriture espace supplier et soumission/retrait de publication. |
| `notifySupplierWorkspaceChange`, `subscribeSupplierWorkspaceChange` | `supplier.js` | Events locaux supplier. |
| `fetchMySupportItems`, `createSupportFeedback` | `support.js` | Support utilisateur courant. |

### Utils

| Fichier | Role |
|---|---|
| `frontend/src/utils/formInput.js` | Validation/normalisation d'inputs numeriques. |
| `frontend/src/utils/userDisplay.js` | Nom, initiales, couleur avatar. |
| `frontend/src/utils/adminLanguage.js` | Traductions admin. |
| `frontend/src/utils/supplierLanguage.js` | Traductions supplier. |
| `frontend/src/utils/userLanguage.js` | Traductions user. |

Fonctions :

| Fonction | Emplacement | Role |
|---|---|---|
| `sanitizeNumericInput(value)` | `formInput.js` | Garde uniquement un format numerique. |
| `isNumericOnly(value)` | `formInput.js` | Detecte une chaine sans texte significatif. |
| `getDisplayName(user)` | `userDisplay.js` | Nom affichable. |
| `getUserInitials(user)` | `userDisplay.js` | Initiales avatar. |
| `getAvatarColor(user)` | `userDisplay.js` | Couleur avatar stable. |
| `getRandomAvatarColor(previousColor)` | `userDisplay.js` | Nouvelle couleur avatar differente. |
| `normalizeAdminLanguage`, `getAdminLanguage`, `getAdminTranslations` | `adminLanguage.js` | Langue admin. |
| `normalizeSupplierLanguage`, `getSupplierLanguage`, `getSupplierTranslations` | `supplierLanguage.js` | Langue supplier. |
| `normalizeUserLanguage`, `getUserTranslations` | `userLanguage.js` | Langue user. |

## Difference Entre `App.css` Et `index.css`

`frontend/src/index.css` est le style global racine. Il est importe une seule fois dans `main.jsx`. Dans ce projet, il importe :

- `styles/fonts.css` : declarations de polices.
- `styles/globals.css` : variables CSS globales, reset/base, tokens generaux.

Son role est transversal : il definit les bases qui doivent exister avant tous les composants.

`frontend/src/App.css` est importe par `App.jsx`. Il contient des styles d'application et de layout plus proches de l'interface ArchiPrice :

- classes generiques historiques comme `.page`, `.card`, `.form`, `.actions`;
- styles de shells et contenus dashboard;
- ajustements visuels communs aux pages user/admin/supplier;
- styles partages qui ne sont pas assez globaux pour `index.css`, mais pas assez locaux pour une page precise.

Regle de bonne pratique :

- Mettre dans `index.css` uniquement les fondations globales.
- Mettre dans `App.css` les layouts applicatifs transverses.
- Mettre les styles d'une page dans son CSS local.
- Mettre les styles d'un composant reutilisable avec le composant.

## Dependances Backend

| Dependence | Role |
|---|---|
| `express` | Framework HTTP API. |
| `cors` | Autorise le frontend Vite a appeler l'API avec credentials. |
| `dotenv` | Charge les variables d'environnement. |
| `mongoose` | ODM MongoDB, schemas/models, queries. |
| `bcryptjs` | Hash et comparaison de mots de passe. |
| `jsonwebtoken` | Creation et verification JWT. |
| `multer` | Parsing multipart/form-data pour upload fichiers. |
| `cloudinary` | Upload, transformation et suppression des images. |
| `nodemailer` | Envoi SMTP, notamment reset password. |
| `nodemon` | Dev dependency, redemarre le backend en developpement. |

## Dependances Frontend

| Dependence | Role |
|---|---|
| `react` | UI declarative et composants. |
| `react-dom` | Rendu React dans le DOM. |
| `react-router-dom` | Routing client, routes protegees, navigation. |
| `axios` | Client HTTP centralise via `services/api.js`. |
| `react-hook-form` | Gestion de formulaires auth/register avec validation. |
| `recharts` | Graphiques dashboard, dont donut chart. |
| `ldrs` | Loader anime utilise par `components/ui/loader.jsx`. |
| `vite` | Dev server et build frontend. |
| `@vitejs/plugin-react` | Plugin React pour Vite. |
| `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | Analyse statique et bonnes pratiques React. |
| `@types/react`, `@types/react-dom` | Types utiles aux outils et IDE, meme si le code est JS. |

## Notes De Maintenance

1. Eviter de dupliquer les URLs API dans les pages : utiliser `constants/api.js`.
2. Eviter d'appeler Axios directement dans les pages : creer ou completer un service.
3. Garder les routes backend minces : route pour branchement, controller/service pour logique.
4. Garder les secrets dans `.env`, jamais dans le code ni dans la doc.
5. Nettoyer les artefacts avec `npm run clean` a la racine.
6. Apres toute modification transversale : lancer `npm run build` dans `frontend/` et verifier les checks backend critiques.
7. Ne pas promouvoir un compte en supplier via `type` ou `category`; seul `role: "supplier"` plus un profil `Supplier` valide ouvre l'espace supplier.
