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
│   └── utils/
└── frontend/
    ├── vite.config.js    # Proxy /api en dev
    └── src/
        ├── components/   # UI réutilisable
        ├── constants/    # Routes API, clés storage
        ├── config/       # env frontend
        ├── context/      # AuthContext
        ├── pages/        # Écrans (routes)
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

## API — Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion → `{ token, user }` |
| `GET` | `/api/auth/me` | Profil (Bearer token) |

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
npm run clean                # Supprime dist/ et cache Vite

cd backend && npm start      # production API
cd frontend && npm run build
cd frontend && npm run lint
```
