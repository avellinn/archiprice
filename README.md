# ArchiPrice

Application de chiffrage et d'estimation pour projets d'architecture (SPA React + API Express).

## Prérequis

- **Node.js** 20+
- **npm** 10+
- **MongoDB** 7+ en local, ou un cluster **MongoDB Atlas** (requis pour l'authentification)

## Structure du projet

```
archi-price/
├── .env.example          # Modèle (copier → .env à la racine)
├── package.json          # Scripts racine (dev:api, dev:web, clean)
├── backend/
│   ├── app.js            # Configuration Express
│   ├── server.js         # Point d'entrée
│   ├── config/           # env, db
│   ├── controllers/      # Logique métier
│   ├── middleware/       # auth, errors, requireDb
│   ├── models/           # Schémas Mongoose
│   ├── routes/           # Routeurs API (/api)
│   ├── services/         # Cloudinary, PDF, realtime
│   └── utils/
└── frontend/
    ├── vite.config.js    # Proxy /api en dev
    └── src/
        ├── components/   # UI réutilisable + shells
        ├── constants/    # Routes API, clés storage
        ├── config/       # env frontend
        ├── context/      # AuthContext
        ├── pages/
        │   ├── admin/    # Pages backoffice
        │   ├── supplier/ # Pages fournisseur validé
        │   └── user/     # Pages utilisateur
        └── services/     # api.js, auth.js, projects.js
```

## Installation

```bash
cp .env.example .env
# Éditer .env à la racine : MONGODB_URI, JWT_SECRET, etc.

npm run install:all
# ou : cd backend && npm install && cd ../frontend && npm install
```

Un seul fichier `.env` à la racine `archi-price/` est requis. Migration depuis `backend/.env` :

```bash
npm run env:migrate
```

Voir la progression détaillée : [`docs/ROADMAP.md`](docs/ROADMAP.md).
Documentation API : [`docs/API.md`](docs/API.md).
Documentation frontend : [`frontend/docs/frontend-documentation.md`](frontend/docs/frontend-documentation.md).
Design system : [`frontend/docs/design-system.md`](frontend/docs/design-system.md).
Audit et nettoyage du workspace : [`docs/WORKSPACE_AUDIT.md`](docs/WORKSPACE_AUDIT.md).
Architecture MVC et flux de données : [`docs/ARCHITECTURE_MVC_DATA_FLOW.md`](docs/ARCHITECTURE_MVC_DATA_FLOW.md).

## Lancement

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Frontend (proxy /api → :5000)
npm run dev:web
```

Équivalent depuis les sous-dossiers : `cd backend && npm run dev` / `cd frontend && npm run dev`.

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API      | http://localhost:5000 |
| Health   | http://localhost:5000/api/health |

Vérifier la base : `curl -s http://localhost:5000/api/health` — `database` doit être `connected` et `databaseReadyState` égal à `1`.

## MongoDB Atlas

1. Créer un cluster, puis **Database Access** (utilisateur `readWrite` sur la base `archiprice`).
2. **Network Access** : autoriser votre IP (dev) ou les IP du serveur (prod).
3. **Connect** → Driver Node → copier l’URI `mongodb+srv://…` dans `.env` :

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/archiprice?retryWrites=true&w=majority
```

Si `MONGODB_URI` est défini et la connexion échoue, l’API ne démarre pas. En production, `MONGODB_URI` est obligatoire.

## Intégration API (frontend)

- **Client unique** : `src/services/api.js` (axios + intercepteurs JWT / 401).
- **Routes centralisées** : `src/constants/api.js` — ne pas disperser les URLs.
- **Services par domaine** : `auth.js`, `projects.js` — un fichier par ressource API, tous passent par `api.js`.
- **Realtime** : `src/services/realtime.js` écoute `/api/realtime` pour synchroniser les rôles user/admin/supplier.
- **Dev** : proxy Vite (`/api` → backend), `baseURL` vide.
- **Prod** : définir `VITE_API_URL` vers l'API déployée.
- **Erreurs** : `getApiErrorMessage(error)` pour afficher `error` renvoyé par l'API.

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port API | `5000` |
| `MONGODB_URI` | MongoDB (local ou Atlas `mongodb+srv://`) | — (obligatoire si `NODE_ENV=production`) |
| `NODE_ENV` | `production` impose `MONGODB_URI` et fail-fast si la DB est injoignable | — |
| `JWT_SECRET` | Secret JWT | — |
| `JWT_EXPIRES_IN` | Expiration token | `7d` |
| `FRONTEND_URL` | CORS | `http://localhost:5173` |
| `VITE_API_URL` | URL API (prod) | vide (proxy en dev) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary uploads images | — |
| `CLOUDINARY_API_KEY` | Cloudinary uploads images | — |
| `CLOUDINARY_API_SECRET` | Cloudinary uploads images | — |

## API — Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion → `{ token, user }` |
| `GET` | `/api/auth/me` | Profil (Bearer token) |
| `GET` | `/api/realtime` | Canal Server-Sent Events authentifié |

Les utilisateurs possèdent un rôle :

- `user` : accès à l'interface utilisateur ;
- `admin` : accès à l'interface backoffice.
- `supplier` : accès à l'interface fournisseur après validation admin.

Les fournisseurs ne reçoivent pas librement le rôle `supplier` à l'inscription. Une inscription `accountType=supplier` crée une demande dans `supplier_requests`; l'admin valide ensuite la demande depuis le backoffice.

Le frontend redirige automatiquement :

- un `user` vers `/dashboard` ;
- un `admin` vers `/admin/dashboard`.
- un `supplier` vers `/supplier/dashboard`.

Le canal realtime publie les événements CRUD principaux pour garder les interfaces synchronisées entre plusieurs navigateurs.

## API — Projets (authentification requise)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects` | Liste des projets de l'utilisateur |
| `POST` | `/api/projects` | Créer un projet |
| `PUT` | `/api/projects/:id` | Modifier un projet |
| `DELETE` | `/api/projects/:id` | Supprimer un projet |

## API — Produits (authentification requise, liés à un projet)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects/:projectId/products` | Catalogue du projet |
| `POST` | `/api/projects/:projectId/products` | Ajouter un produit |
| `PUT` | `/api/projects/:projectId/products/:id` | Modifier un produit |
| `DELETE` | `/api/projects/:projectId/products/:id` | Supprimer un produit |

Corps JSON exemple (création) : `{ "name": "Carrelage", "unit": "m2", "unitPrice": 45.5, "category": "Revêtements" }`  
Unités : `u`, `m2`, `ml`, `m3`, `h`, `forfait`.

## API — Admin

Les routes admin sont protégées par JWT et par le middleware `requireAdmin`.

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/admin/users` | Liste tous les utilisateurs |
| `GET` | `/api/admin/users/:id` | Détail d'un utilisateur |
| `PUT` | `/api/admin/users/:id/role` | Change le rôle `user` / `admin` |
| `GET` | `/api/admin/suppliers` | Liste les fournisseurs validés |
| `POST` | `/api/admin/suppliers` | Crée un fournisseur administré |
| `PUT` | `/api/admin/suppliers/:id` | Modifie un fournisseur |
| `DELETE` | `/api/admin/suppliers/:id` | Supprime un fournisseur |
| `GET` | `/api/admin/supplier-requests` | Liste les demandes fournisseur |
| `POST` | `/api/admin/supplier-requests/:id/approve` | Valide une demande fournisseur |
| `POST` | `/api/admin/supplier-requests/:id/reject` | Refuse une demande fournisseur |
| `GET` | `/api/admin/simulations` | Liste les simulations et estimations exportées |
| `GET` | `/api/admin/support-items` | Liste tickets, feedback et signalements |

Exemple changement de rôle :

```bash
curl -X PUT http://localhost:5000/api/admin/users/<userId>/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

## API — Supplier

Les routes supplier sont protégées par JWT et `requireSupplier`.

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/supplier/workspace` | Données de l'espace fournisseur |
| `GET` | `/api/supplier/products` | Liste des produits du fournisseur |
| `POST` | `/api/supplier/products` | Crée un produit et upload ses images |
| `PUT` | `/api/supplier/products/:productId` | Modifie un produit du fournisseur courant |
| `DELETE` | `/api/supplier/products/:productId` | Supprime un produit du fournisseur courant et ses images Cloudinary |

`POST` et `PUT /api/supplier/products` utilisent `multipart/form-data`, champ fichier `image` répété jusqu'à 12 fois. Les images sont streamées vers Cloudinary, dossier `archiprice/products`.

## Routes Frontend

Routes publiques :

- `/`
- `/login`
- `/register`

Routes utilisateur :

- `/dashboard`
- `/catalogue`
- `/workspace`
- `/factures`
- `/deconnexion`

Routes admin :

- `/admin/dashboard`
- `/admin/catalogue/products`
- `/admin/catalogue/filters`
- `/admin/suppliers`
- `/admin/suppliers/requests`
- `/admin/users`
- `/admin/simulations`
- `/admin/support`
- `/admin/settings`

Routes supplier :

- `/supplier/dashboard` : analyses de données
- `/supplier/shop` : ma boutique
- `/supplier/products` : produits
- `/supplier/products/new` : ajouter un produit et uploader des images
- `/supplier/clients`
- `/supplier/content/files`
- `/supplier/settings`

La route supplier catalogue a été supprimée. Les produits et catalogues fournisseur passent par `/supplier/products`, `/supplier/products/new`, `/supplier/shop` et `/supplier/content/files`.

## Design System

Règle d'interface :

**70 à 80% mutualisé, 20 à 30% spécifique au rôle.**

Les composants UI sont partagés :

- boutons ;
- inputs ;
- tables ;
- modals ;
- cards ;
- badges ;
- header ;
- sidebar ;
- icônes ;
- typographie.
- alertes applicatives (`Alert.jsx`) ;
- tables (`Table.jsx`) ;
- écran serveur (`ServerError.jsx`).

Les layouts restent spécifiques :

- `AppShell.jsx` pour les utilisateurs ;
- `AdminShell.jsx` pour les administrateurs.
- `SupplierShell.jsx` pour les fournisseurs validés.

Les messages applicatifs ne doivent pas utiliser `window.alert`, `window.confirm` ou `window.prompt` dans les workflows admin. Utiliser `Alert.jsx` ou une modale React.

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@archi.price","password":"secret12","name":"Demo"}'
```

## Scripts

Les requêtes HTTP s’affichent dans le terminal backend, ex. `[http] GET /api/health → 200 (12ms)`.

```bash
npm run dev:api              # API (nodemon) — regarder CE terminal pour les logs
npm run dev:web              # Frontend Vite
npm run clean                # Supprime dist/ et caches locaux générés

cd backend && npm start      # production API
cd frontend && npm run build
cd frontend && npm run lint
```
