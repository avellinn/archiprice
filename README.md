# ArchiPrice

Application de chiffrage et d'estimation pour projets d'architecture (SPA React + API Express).

## Prérequis

- **Node.js** 20+
- **npm** 10+
- **MongoDB** 7+ (requis pour l'authentification)

## Structure du projet

```
archi-price/
├── .env.example          # Variables (copier → .env)
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
        └── services/     # Client HTTP (axios)
```

## Installation

```bash
cp .env.example .env
# Éditer .env : MONGODB_URI, JWT_SECRET

cd backend && npm install
cd ../frontend && npm install
```

## Lancement

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Frontend (proxy /api → :5000)
cd frontend && npm run dev
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API      | http://localhost:5000 |
| Health   | http://localhost:5000/api/health |

## Intégration API (frontend)

- **Client unique** : `src/services/api.js` (axios + intercepteurs JWT / 401).
- **Routes centralisées** : `src/constants/api.js` — ne pas disperser les URLs.
- **Dev** : proxy Vite (`/api` → backend), `baseURL` vide.
- **Prod** : définir `VITE_API_URL` vers l'API déployée.
- **Erreurs** : `getApiErrorMessage(error)` pour afficher `error` renvoyé par l'API.

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port API | `5000` |
| `MONGODB_URI` | MongoDB | — |
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

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@archi.price","password":"secret12","name":"Demo"}'
```

## Scripts

```bash
cd backend && npm run dev    # nodemon
cd backend && npm start      # production
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
```
