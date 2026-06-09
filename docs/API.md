# Documentation API ArchiPrice

Date : 2026-06-03

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

## Temps Réel

Le backend expose un canal Server-Sent Events pour synchroniser les interfaces ouvertes dans plusieurs navigateurs ou comptes.

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/realtime` | Auth | Flux SSE des événements CRUD et notifications |

Authentification :

- via header `Authorization: Bearer <token>` quand le client le supporte ;
- via query `?token=<token>` pour `EventSource`.

Exemples d'événements :

- `auth:create`
- `project:create|update|delete`
- `product:create|update|delete`
- `catalogue-config:update`
- `admin:supplier:update`
- `supplier:product:update`

Les shells React (`AppShell`, `AdminShell`, `SupplierShell`) écoutent ce canal pour rafraîchir les stores frontend concernés.

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
- `supplier`

### Inscription fournisseur

Le frontend peut envoyer `accountType: "supplier"` sur `/api/auth/register`.
Le backend ne donne jamais directement le rôle `supplier` à partir du payload frontend.

Flux :

1. création d'un `User` avec `role: "user"` et `type: "Fournisseur"` ;
2. création d'une entrée `supplier_requests` ;
3. l'utilisateur voit une page d'attente ;
4. l'admin valide ou refuse la demande ;
5. après validation, le backend force `role: "supplier"` et crée/lie le profil `Supplier`.

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
| `PATCH` | `/api/admin/users/:id` | Modifie nom, email, téléphone, statut, etc. |
| `DELETE` | `/api/admin/users/:id` | Supprime un utilisateur |
| `PUT` | `/api/admin/users/:id/role` | Change le rôle d'un utilisateur |
| `GET` | `/api/admin/suppliers` | Liste les fournisseurs validés |
| `POST` | `/api/admin/suppliers` | Crée un fournisseur administré |
| `PUT` | `/api/admin/suppliers/:id` | Modifie un fournisseur |
| `DELETE` | `/api/admin/suppliers/:id` | Supprime un fournisseur |
| `GET` | `/api/admin/supplier-requests` | Liste les demandes fournisseur |
| `POST` | `/api/admin/supplier-requests/:id/approve` | Valide une demande fournisseur |
| `POST` | `/api/admin/supplier-requests/:id/reject` | Refuse une demande fournisseur |
| `GET` | `/api/admin/simulations` | Liste les simulations/estimations exportées |
| `POST` | `/api/admin/simulations` | Crée une simulation admin/fallback |
| `PATCH` | `/api/admin/simulations/:id` | Modifie une simulation |
| `GET` | `/api/admin/support-items` | Liste tickets, feedback et signalements |
| `POST` | `/api/admin/support-items` | Crée un élément support |
| `PATCH` | `/api/admin/support-items/:id` | Modifie un élément support |

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

Les pages admin n'utilisent pas les alertes navigateur. Les erreurs et confirmations UI passent par `frontend/src/components/ui/Alert.jsx` ou par des modales React.

## Supplier

Routes protégées par :

1. `protect`
2. `requireSupplier`

Un compte fournisseur n'a accès à ces routes qu'après validation admin.

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/supplier/me` | Profil fournisseur courant |
| `PUT` | `/api/supplier/me` | Met à jour les informations fournisseur |
| `GET` | `/api/supplier/workspace` | Données de l'espace fournisseur |
| `GET` | `/api/supplier/products` | Liste les produits du fournisseur |
| `POST` | `/api/supplier/products` | Crée un produit fournisseur avec images optionnelles |
| `PUT` | `/api/supplier/products/:productId` | Modifie un produit fournisseur et ajoute éventuellement des images |
| `DELETE` | `/api/supplier/products/:productId` | Supprime un produit fournisseur et ses images Cloudinary |
| `DELETE` | `/api/supplier/products/:productId/images` | Supprime une image Cloudinary d'un produit fournisseur |

`POST` et `PUT /api/supplier/products` acceptent un `multipart/form-data` :

- champs texte : `name`, `description`, `category`, `unit`, `unitPrice` ;
- fichiers : champ `image` répété, sans limite arbitraire côté interface admin/supplier ;
- formats : JPG, PNG, WebP ;
- taille max : 5 Mo par image.

Les images sont envoyées vers Cloudinary, dossier `archiprice/products`. MongoDB stocke uniquement `secure_url`, `public_id` et `metadata`.

## Catalogue Config

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/catalogue-config` | Public/Auth selon contexte dev | Configuration catalogue |
| `PUT` | `/api/catalogue-config` | Admin | Met à jour catégories, pièces, gammes, villes, quartiers, disponibilités |

La configuration catalogue alimente :

- les filtres user dans `Catalogue.jsx` ;
- les formulaires admin `CategoriesFiltres.jsx` et `Articles.jsx` ;
- les formulaires supplier `AjouterProduit.jsx`.

## Uploads

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `POST` | `/api/uploads/products/images` | Auth | Upload images produit vers Cloudinary |
| `DELETE` | `/api/uploads/products/images` | Auth | Supprime une image via `public_id` |

Les uploads utilisent `multer.memoryStorage()` et ne stockent aucun fichier local.

## PDF Récapitulatif

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/projects/:id/recap.pdf` | Auth propriétaire/admin selon règles backend | Génère un PDF en mémoire |

Le PDF contient les données MongoDB au moment de la génération : projet, utilisateur, articles, prix, totaux et liens Cloudinary vers les images.

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
