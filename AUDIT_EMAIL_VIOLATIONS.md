# Audit: Violations d'utilisation d'email comme clé de liaison métier

## Date: 2026-06-25

## Règle d'or
> Après l'inscription, seul `_id` (ObjectId) doit servir de clé de liaison.  
> `email` ne doit être utilisé que pour: connexion, récupération mot de passe, notifications.

---

## 1. Modèles MongoDB - Champs à convertir

### Simulation.js:16-17
```javascript
email: { type: String, required: true, lowercase: true, trim: true },
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
```
**PROBLÈME**: `email` est `required: true`. Doit être `userId` qui devient le champ principal.

### SupportItem.js:24-25, 31
```javascript
user: { type: String, required: true, trim: true },
email: { type: String, lowercase: true, trim: true },
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
```
**PROBLÈME**: `user` (String) et `email` utilisés au lieu de `userId` (ObjectId) comme clé principale.

### Demande.js:67-84
```javascript
clientEmail: { type: String, lowercase: true, trim: true }
```
**OK**: `clientEmail` est un champ de données (contact client), pas une clé de liaison.

---

## 2. Backend - Violations de création/utilisation

### simulations.js:52-60 - CRÉATION
```javascript
const simulation = await Simulation.create({
  ...req.body,
  user: req.body.user || userName,
  email: req.body.email || userEmail,  // ❌ VIOLATION
  userId: req.user._id,
```

### simulations.js:28-31 - MISE À JOUR
```javascript
if (sourceId && sourceType) {
  const existing = await Simulation.findOne({ sourceId, sourceType });
  if (existing) {
    ...
    existing.email = req.body.email || existing.email || userEmail;  // ❌ VIOLATION
```

### projectController.js:52-65 - CRÉATION
```javascript
await Simulation.create({
  user: req.user?.name || req.user?.email || 'Utilisateur ArchiPrice',
  email: req.user?.email || '',  // ❌ VIOLATION
  userId: req.user._id,
```

### supportItems.js:35-37 - CRÉATION
```javascript
user: req.user.name || req.user.email,
email: req.user.email,  // ❌ VIOLATION - utilisé comme fallback pour `user`
userId: req.user._id,
```

---

## 3. Backend - Suppressions par email (au lieu de userId)

### admin.js:244
```javascript
if (user.email) await Simulation.deleteMany({ email: user.email });
```

### admin.js:222, 241 - Suppression SupportItem
```javascript
...(user.email ? [{ email: user.email }] : []),
if (user.email) await Simulation.deleteMany({ email: user.email });
```

### admin.js:479
```javascript
await Simulation.deleteMany({ email: supplier.email });
```

**PRÉCONISATION**: Utiliser `userId: ObjectId` pour toutes les suppressions cascade.

---

## 4. Backend - Recherche par email (problématique)

### demandes.js:69-76 - Recherche fournisseur par email
```javascript
if (supplierContact) {
  const supplier = await Supplier.findOne({
    $or: [
      ...(supplierContact ? [{ email: supplierContact }, { contact: supplierContact }] : []),
      ...(supplierName ? [{ name: supplierName }, { companyName: supplierName }] : []),
    ],
  });
```
**PROBLÈME**: Recherche par email/contact pour retrouver un fournisseur. Cette logique devrait utiliser uniquement l'ID.

### demandes.js:217-222 - Validation fournisseur
```javascript
const supplier = req.user.role === 'supplier'
  ? await Supplier.findOne({
      $or: [
        { _id: demande.supplier },
        { user: req.user._id },
        { email: String(req.user.email || '').toLowerCase().trim() },  // ❌ VIOLATION
      ],
```

### admin.js:129-133 - ensureSupplierProfile
```javascript
const supplier = await Supplier.findOne({
  $or: [
    { user: user._id },
    ...(email ? [{ email }] : []),
  ],
});
```
**PROBLÈME**: Recherche par email pour trouver le profil fournisseur.

### supplier.js:96-97 - findOrCreateSupplierProfile
```javascript
async function findOrCreateSupplierProfile(user) {
  const supplier = await Supplier.findOne({ user: user._id });
```
**OK**: Recherche correcte par `user._id`. Mais création à la ligne 103 inclut email.

---

## 5. Frontend - Comparaisons par email

### Catalogue.jsx:119-122
```javascript
function isSupplierVisibleForCatalogue(product, adminData) {
  const supplier = (adminData.suppliers || []).find((item) => (
    item.name === product.supplier
    || item.companyName === product.supplier
    || item.email === product.supplier  // ❌ VIOLATION
```

### Parametres.jsx:147-159
```javascript
const supplierExists = suppliers.some((item) => (
  item.id === normalizedSupplier.id
  || (item.email && item.email === normalizedSupplier.email)  // ❌ VIOLATION
  || (item.contact && item.contact === normalizedSupplier.contact)
));
```

---

## 6. Plan de correction

### Phase 1: Modèles (breaking changes)
1. **Simulation.js**: Supprimer `email: required`, garder seulement `userId: ObjectId`
2. **SupportItem.js**: Supprimer `email` et `user` (String), garder seulement `userId`

### Phase 2: Routes backend
1. **simulations.js**: Supprimer `email` des créations/mises à jour, utiliser `userId`
2. **supportItems.js**: Supprimer `email` des créations
3. **admin.js:deleteUserCascade**: Remplacer `email` par `userId`
4. **admin.js:deleteSupplierPermanent**: Remplacer `email` par `userId`
5. **demandes.js**: Supprimer recherche par email dans validation fournisseur

### Phase 3: Nettoyage données
```javascript
// Script MongoDB pour nettoyer les données existantes
db.simulations.updateMany(
  { userId: { $exists: true, $ne: null } },
  [{ $set: { userId: { $toObjectId: "$userId" } } }]
);
db.supportitems.updateMany(
  { userId: { $exists: true, $ne: null } },
  [{ $set: { userId: { $toObjectId: "$userId" } } }]
);
```

---

## 7. Fichiers concernés

| Fichier | Type | Action |
|---------|------|--------|
| `backend/models/Simulation.js` | Modèle | Supprimer champ `email` required |
| `backend/models/SupportItem.js` | Modèle | Supprimer champs `user` et `email` |
| `backend/routes/simulations.js` | Route | Supprimer `email` des opérations |
| `backend/routes/supportItems.js` | Route | Supprimer `email` des opérations |
| `backend/routes/admin.js` | Route | Remplacer `email` par `userId` dans suppressions |
| `backend/routes/demandes.js` | Route | Supprimer recherche par email fournisseur |
| `backend/controllers/projectController.js` | Contrôleur | Supprimer `email` dans création simulation |
| `frontend/src/pages/user/Catalogue/Catalogue.jsx` | Composant | Supprimer comparaison par email |
| `frontend/src/pages/supplier/Parametres/Parametres.jsx` | Composant | Supprimer comparaison par email |

---

## 8. Correctifs appliqués (2026-06-25)

### Backend
- Cascade `deleteUserCascade` : suppressions par `userId`, ajout `Demande` + `PasswordResetToken`, purge `catalogueConfig.json`
- Routes `simulations.js`, `supportItems.js`, `projectController.js` : création sans champ `email`
- Dédoublonnage simulation scopé `{ sourceId, sourceType, userId }`
- `GET /admin/simulations` : filtre les utilisateurs `status !== 'Supprimé'`

### Frontend
- `AuthContext` + `scopedStorage` : purge localStorage à l'inscription et à la connexion
- `Demande.jsx` / `Demandesup.jsx` : filtrage par `clientId` uniquement, badge « Message lu » en regular
- `Catalogue.jsx` : gate projet 48h recalculé, archive projet via `upsertProjectArchive`
- `Archives.jsx` : i18n + fallback `fileName`
- `Alert.jsx` : toast fixe 3,5s sans décalage (`layout="toast"` | `"inline"`)
- Admin `Utilisateurs` / `Fournisseurs` : badge « Inexistant », comptes orphelins, suppression définitive locale ou API
- Traductions étendues : `userLanguage`, `supplierLanguage`, `adminLanguage`