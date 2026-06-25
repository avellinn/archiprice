# Audit Rapport: Problème d'Héritage de Données Après Suppression Compte

## Date: 2026-06-24

## 1. Cause exacte du problème

Le problème principal est **une combinaison de facteurs**:

### 1.1 Suppression logique (soft delete) au lieu de suppression physique
Dans `admin.js:375-389`, la suppression utilisateur (`DELETE /users/:id`) ne fait qu'un **soft delete**:
```javascript
user.status = 'Supprimé';
await user.save();
```
Le document utilisateur reste en base de données avec `status: 'Supprimé'`, ce qui empêche la création d'un nouveau compte avec la même email mais laisse les données existantes accessibles.

### 1.2 Recherche par email lors de l'inscription
Dans `authController.js:121`, l'inscription vérifie seulement si l'email existe déjà sans distinction de statut. **Un utilisateur supprimé bloque la création d'un nouveau compte avec la même email**, mais si l'utilisateur est créé via une autre voie (admin panel), les données sont accessibles via email.

### 1.3 Relations basées sur l'email
Plusieurs collections utilisent l'email comme clé de liaison:
- `Simulation` - possède un champ `email` indexé
- `SupportItem` - possède un champ `email` 
- `Supplier` - recherche par email dans `ensureSupplierProfile` et `findOrCreateSupplierProfile`

Lors de la création d'un nouveau fournisseur ou d'une simulation, l'email peut récupérer les données d'un compte supprimé.

### 1.4 Restauration automatique du profil fournisseur
Dans `ensureSupplierProfile` et `findOrCreateSupplierProfile`, si un fournisseur avec le même email existe mais a `status: 'Supprimé'`, le code **restaurait automatiquement le profil existant**, récupérant ainsi les produits et données associés.

---

## 2. Niveau de gravité

**CRITIQUE (P1)** - Violation de l'isolation des données utilisateur. Un utilisateur supprimé peut se faire recréer un compte (via admin) et hériter des données d'un ancien compte avec la même email.

---

## 3. Collections concernées

| Collection | Problème | Impact |
|------------|----------|--------|
| `Simulation` | Lie par email | Simulations visibles après recréation |
| `SupportItem` | Lie par email | Historique support récupéré |
| `Supplier` | Restauration auto | Produits et données boutique hérités |
| `Project` | Lié par userId | Fonctionne correctement (isolation OK) |
| `Product` | Lié par supplier/supplierUser | Hérité via Supplier |

---

## 4. Correctifs recommandés et implémentés

### 4.1 Backend - authController.js
- ✅ **Bloqué la connexion des comptes supprimés** - retourne une erreur explicative
- ✅ **Bloqué la réinscription avec une email supprimée** - retourne une erreur contact support
- ✅ **Création d'un nouveau profil fournisseur** au lieu de restaurer un profil supprimé

### 4.2 Backend - admin.js
- ✅ **Création d'un nouveau profil fournisseur** lors de la modification de rôle vers supplier si l'ancien est supprimé

### 4.3 Backend - supplier.js
- ✅ **Création d'un nouveau profil fournisseur** au lieu de restaurer un profil supprimé

### 4.4 Frontend - Utilisateurs.jsx & Fournisseurs.jsx
- ✅ **Affichage du badge "Inexistant"** pour les comptes avec `status: 'Supprimé'`
- ✅ **Masquage des simulations/produits** pour les comptes supprimés dans l'affichage

---

## 5. Risques potentiels pour les autres utilisateurs

- **Risque de perte de données**: Aucun - les données des comptes supprimés sont conservées jusqu'à la suppression définitive
- **Risque de sécurité**: Modéré - Un utilisateur malveillant pourrait conserver l'email d'un utilisateur supprimé et profiter de données publiques
- **Risque de confusion**: Élevé - Les admin peuvent être trompés par l'affichage des données héritées

---

## 6. Procédure de nettoyage à appliquer

Pour les comptes marqués `Supprimé` qui ne doivent plus être réactivés:

```javascript
// Script à exécuter manuellement dans MongoDB
db.users.deleteMany({ status: 'Supprimé' })
db.suppliers.deleteMany({ status: 'Supprimé' })
db.simulations.deleteMany({ email: { $in: deletedEmails } })
db.supportitems.deleteMany({ $or: [{ email: { $in: deletedEmails } }, { userId: { $in: deletedUserIds } }] })
```

---

## 7. Changements effectués

| Fichier | Modification |
|---------|-------------|
| `backend/controllers/authController.js` | Blocage connexion + inscription comptes supprimés, création nouveau supplier |
| `backend/routes/admin.js` | Même logique pour ensureSupplierProfile |
| `backend/routes/supplier.js` | Même logique pour findOrCreateSupplierProfile |
| `frontend/src/pages/admin/Utilisateurs/Utilisateurs.jsx` | Badge "Inexistant" + masquage simulations |
| `frontend/src/pages/admin/Fournisseurs/Fournisseurs.jsx` | Badge "Inexistant" + masquage produits |

---

## 8. Actions supplémentaires recommandées

1. Ajouter un job de nettoyage périodique pour supprimer les comptes `Supprimé` après X jours
2. Considérer l'utilisation exclusive de `userId` (ObjectId) comme clé de liaison plutôt que `email`
3. Ajouter une case à cocher "Permettre la réinscription" dans l'admin panel pour les comptes supprimés