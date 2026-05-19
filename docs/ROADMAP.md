# Roadmap ArchiPrice — progression structurée

| Étape | Objectif | Statut |
|-------|----------|--------|
| **0** | Fondations (MongoDB, auth, API Project) | ✅ |
| **1** | Nettoyage workspace | ✅ |
| **2** | Un seul `.env` à la racine | ✅ |
| **3** | UI Dashboard — projets (CRUD) | ✅ |
| **4** | Modèle Product + API backend + service frontend | ✅ |
| **5** | UI catalogue produits par projet | ⏳ Prochaine |

## Étape 4 — Product ✅

- [x] `models/Product.js` — lié à un `Project`
- [x] `controllers/productController.js` — CRUD + vérification propriétaire du projet
- [x] `routes/products.js` — `/api/projects/:projectId/products`
- [x] `frontend/src/services/products.js` + `constants/api.js`

### Validation manuelle

```bash
# 1. Token après login
TOKEN="..."

# 2. Créer ou récupérer un projectId
curl -s http://localhost:5000/api/projects -H "Authorization: Bearer $TOKEN"

# 3. Ajouter un produit
curl -s -X POST "http://localhost:5000/api/projects/<projectId>/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Peinture murale","unit":"m2","unitPrice":12.5,"category":"Finitions"}'

# 4. Lister le catalogue
curl -s "http://localhost:5000/api/projects/<projectId>/products" \
  -H "Authorization: Bearer $TOKEN"
```

## Étape 5 — UI catalogue (prochaine)

- [ ] Composant catalogue dans le Dashboard ou page dédiée
- [ ] Sélection d’un projet → liste / CRUD produits

---

*Dernière mise à jour : étape 4 terminée.*
