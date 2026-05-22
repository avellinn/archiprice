# Documentation API ArchiPrice

Date : 2026-05-22

## Base

En développement, l'API écoute par défaut sur :

```txt
http://localhost:5000/api
```

Le frontend Vite proxifie `/api` vers le backend.

## Authentification

Les routes protégées attendent :

```http
Authorization: Bearer <token>
```

Le token est généré à la connexion et stocké côté frontend via le service auth.

## Healthcheck

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/health` | Public | État API et MongoDB |

## Auth

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `POST` | `/api/auth/register` | Public | Crée un compte |
| `POST` | `/api/auth/login` | Public | Connecte un compte |
| `GET` | `/api/auth/me` | Auth | Retourne l'utilisateur courant |

Réponse login/register :

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "name": "Demo",
    "email": "demo@example.com",
    "role": "user"
  }
}
```

Rôles possibles :

- `user`
- `admin`

## Projets

Routes protégées par authentification.

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects` | Liste les projets du compte courant |
| `POST` | `/api/projects` | Crée un projet |
| `PUT` | `/api/projects/:id` | Modifie un projet |
| `DELETE` | `/api/projects/:id` | Supprime un projet |

Les projets sont associés à l'utilisateur connecté.

## Produits De Projet

Routes protégées par authentification.

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects/:projectId/products` | Liste les produits du projet |
| `POST` | `/api/projects/:projectId/products` | Ajoute un produit au projet |
| `PUT` | `/api/projects/:projectId/products/:id` | Modifie un produit |
| `DELETE` | `/api/projects/:projectId/products/:id` | Supprime un produit |

Unités acceptées :

- `u`
- `m2`
- `ml`
- `m3`
- `h`
- `forfait`

## Admin

Routes protégées par :

1. `protect`
2. `requireAdmin`

Un utilisateur non authentifié reçoit `401`.

Un utilisateur authentifié sans rôle admin reçoit `403`.

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/admin/users` | Liste tous les utilisateurs |
| `GET` | `/api/admin/users/:id` | Détail d'un utilisateur |
| `PUT` | `/api/admin/users/:id/role` | Change le rôle d'un utilisateur |
| `GET` | `/api/admin/test` | Vérifie l'accès backoffice |

Corps pour changer un rôle :

```json
{
  "role": "admin"
}
```

ou :

```json
{
  "role": "user"
}
```

Réponse utilisateur admin :

```json
{
  "id": "...",
  "name": "Demo",
  "email": "demo@example.com",
  "role": "admin",
  "createdAt": "2026-05-22T00:00:00.000Z",
  "updatedAt": "2026-05-22T00:00:00.000Z"
}
```

Le champ `password` est exclu.

## Erreurs

Format général :

```json
{
  "error": "Message d'erreur"
}
```

Codes fréquents :

- `400` : payload invalide ;
- `401` : token absent, invalide ou expiré ;
- `403` : rôle insuffisant ;
- `404` : ressource introuvable ;
- `500` : erreur serveur.

## Exemples Curl

Créer un compte :

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@archiprice.test","password":"secret12","name":"Demo"}'
```

Connexion :

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@archiprice.test","password":"secret12"}'
```

Lister les projets :

```bash
curl http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

Lister les utilisateurs admin :

```bash
curl http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
