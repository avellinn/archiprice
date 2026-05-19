# Roadmap ArchiPrice — progression structurée

Chaque étape est **indépendante et validable** avant de passer à la suivante.

| Étape | Objectif | Statut |
|-------|----------|--------|
| **0** | Fondations (MongoDB, auth, API Project) | ✅ Fait |
| **1** | Nettoyage workspace | ✅ Fait |
| **2** | Un seul `.env` à la racine | ✅ Fait |
| **3** | UI Dashboard — projets (liste, CRUD) | ✅ Fait |
| **4** | Modèle Product + API backend | ⏳ Prochaine |
| **5** | UI catalogue produits | ⏳ À faire |

## Critères de validation

### Étape 2 — `.env` unique ✅
- [x] `archi-price/.env` à la racine (`MONGODB_URI`, `JWT_SECRET`, etc.)
- [x] `backend/.env` supprimé
- [x] Script `npm run env:migrate` pour migration
- [ ] **À valider chez vous** : `npm run dev:api` + `/api/health` → `connected`

### Étape 3 — Dashboard projets ✅
- [x] Composant `ProjectList` (liste, création, modification, suppression)
- [x] Service `projects.js` + routes dans `constants/api.js`
- [ ] **À valider chez vous** : connexion → Dashboard → créer un projet

### Étape 4 — Product (prochaine)
- [ ] Modèle `Product`, contrôleur, routes protégées
- [ ] Service frontend `products.js`

---

## Commandes utiles

```bash
cd archi-price
npm run env:migrate    # si besoin de regénérer .env depuis backend/.env
npm run dev:api
npm run dev:web
```

*Dernière mise à jour : étapes 2 et 3 terminées.*
