# ArchiPrice

Application de chiffrage et d'estimation pour projets d'architecture (SPA React + API Express).

## Prérequis

- **Node.js** 20+ (recommandé)
- **npm** 10+
- **MongoDB** 7+ (optionnel en local — l'API démarre sans DB si MongoDB est indisponible)

## Structure

```
archi-price/
├── backend/     # API Express (port 5000)
├── frontend/    # SPA React + Vite (port 5173)
├── .env         # Variables d'environnement (copier depuis .env.example)
└── .env.example
```

## Installation

```bash
# À la racine du dépôt archi-price
cp .env.example .env

cd backend && npm install
cd ../frontend && npm install
```

Optionnel pour le frontend :

```bash
cp frontend/.env.example frontend/.env
```

## Lancement en développement

Terminal 1 — API :

```bash
cd backend
npm run dev
```

Terminal 2 — Frontend :

```bash
cd frontend
npm run dev
```

| Service   | URL                                      |
|-----------|------------------------------------------|
| Frontend  | http://localhost:5173                    |
| API       | http://localhost:5000                    |
| Health    | http://localhost:5000/api/health         |

## Variables d'environnement

| Variable       | Description                          | Défaut                          |
|----------------|--------------------------------------|---------------------------------|
| `PORT`         | Port de l'API                        | `5000`                          |
| `MONGODB_URI`  | Connexion MongoDB                    | — (API sans DB si absent)       |
| `JWT_SECRET`   | Secret JWT (auth à venir)            | —                               |
| `FRONTEND_URL` | Origine autorisée par CORS           | `http://localhost:5173`         |
| `VITE_API_URL` | URL de l'API pour le frontend        | `http://localhost:5000`         |

## Scripts utiles

```bash
# Backend
cd backend && npm start      # production
cd backend && npm run dev    # nodemon

# Frontend
cd frontend && npm run build
cd frontend && npm run lint
```

## Sprint 1 — livré

- API : CORS, `GET /api/health`, connexion Mongoose avec repli si DB absente
- Frontend : routes `/` et `/login`, client `axios` (`src/services/api.js`)
- Configuration : `.env.example`, ce README
