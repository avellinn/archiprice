# Roadmap ArchiPrice

Dernière mise à jour : 2026-06-03

## État Global

ArchiPrice dispose maintenant :

- d'une API Express/Mongoose ;
- d'une authentification JWT ;
- de rôles `user`, `admin` et `supplier` ;
- d'une interface utilisateur protégée ;
- d'une interface admin protégée ;
- d'un catalogue produits côté frontend ;
- d'un workspace projet dynamique ;
- d'un design system partagé ;
- d'une documentation frontend, API, design system et MVC mise à jour.

## Progression

| Étape | Objectif | Statut |
|-------|----------|--------|
| 0 | Fondations backend, Express, MongoDB, env | Terminé |
| 1 | Authentification JWT | Terminé |
| 2 | CRUD projets | Terminé |
| 3 | CRUD produits liés aux projets | Terminé |
| 4 | Interface utilisateur principale | Terminé |
| 5 | Dashboard one-page et stats projets | Terminé |
| 6 | Catalogue produits avec simulation budget | Terminé / itératif |
| 7 | Workspace projet détaillé | Terminé / itératif |
| 8 | Rôle admin + routes admin | Terminé / itératif |
| 9 | Design system partagé user/admin/supplier | Terminé / itératif |
| 10 | Pages admin métier complètes | En cours avancé |
| 11 | Compte supplier direct avec boutique synchronisée | En cours avancé |
| 12 | Synchronisation realtime entre rôles | En cours |

## Interface Utilisateur

Pages en place :

- Accueil
- Connexion
- Inscription
- Tableau de bord
- Explorer catalogue
- Mon espace de travail
- Estimations exportées
- Déconnexion

Points clés :

- sidebar et header partagés ;
- dark mode au niveau shell ;
- avatar dynamique ;
- CTA nouveau projet ;
- modale de création projet ;
- workspace avec mode cards et mode projet ;
- catalogue avec filtres, cartes produits, simulation budget et récapitulatif.
- paramètres profil user ;
- export PDF et liste d'estimations exportées ;
- modal "Où acheter" alimentée par les fournisseurs admin.

## Interface Admin

Routes en place :

- `/admin/dashboard`
- `/admin/catalogue/products`
- `/admin/catalogue/filters`
- `/admin/suppliers`
- `/admin/suppliers/requests` → redirection héritée vers `/admin/suppliers`
- `/admin/users`
- `/admin/simulations`
- `/admin/support`
- `/admin/settings`

Menus admin :

- Tableau de bord
- Catalogue
  - Produits
  - Catégories & filtres
- Fournisseurs
  - Liste fournisseurs
  - Nouvelles demandes
- Utilisateurs
- Simulations
- Support : Tickets, Feedback, Signalements prix
- Paramètres : Configuration simulations, Coefficients régionaux
- Déconnexion

En place :

- pages métier admin principales ;
- CRUD utilisateurs ;
- liste fournisseurs validés ;
- demandes fournisseur ;
- validation/refus des publications supplier ;
- simulations/estimations exportées ;
- support regroupé ;
- paramètres regroupés.

À poursuivre :

- affiner les dashboards métier ;
- finaliser la persistance de tous les paramètres avancés ;
- optimiser les tables très longues.

## Interface Supplier

Routes en place :

- `/supplier/dashboard`
- `/supplier/shop`
- `/supplier/products`
- `/supplier/products/new`
- `/supplier/clients`
- `/supplier/content/files`
- `/supplier/settings`
Points clés :

- accès supplier direct après inscription ;
- création/publication de produits avec upload Cloudinary ;
- produits visibles user uniquement après validation admin ;
- boutique dynamique ;
- fichiers centralisés ;
- clients issus des interactions user "Où acheter" ;
- paramètres boutique synchronisés.

## Backend

API en place :

- healthcheck ;
- auth ;
- projets ;
- produits ;
- admin users.

Routes admin en place :

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `PUT /api/admin/users/:id/role`
- `GET/POST/PUT/DELETE /api/admin/suppliers`
- `GET/POST/PATCH /api/admin/simulations`
- `GET/POST/PATCH /api/admin/support-items`

À faire :

- extraire davantage de logique volumineuse des routes vers controllers/services ;
- documenter plus finement les schémas Mongo ;
- renforcer les tests automatisés API.

## Design System

Règle validée :

**70 à 80% mutualisé, 20 à 30% spécifique au rôle.**

Partagé :

- boutons ;
- inputs ;
- selects ;
- tables ;
- modals ;
- cards ;
- dropdowns ;
- badges ;
- loaders ;
- empty states ;
- header ;
- sidebar ;
- icônes ;
- typographie.

Spécifique :

- `AppShell.jsx` pour l'utilisateur ;
- `AdminShell.jsx` pour l'admin ;
- `SupplierShell.jsx` pour le fournisseur ;
- routes et menus par rôle ;
- contenus métier par rôle.

Règles récentes :

- dark mode global via `.dashboard-shell.is-theme-dark` et variables `--app-*` ;
- messages applicatifs via `Alert.jsx` ;
- pages par dossier `Page/Page.jsx` + `Page/Page.css`.

## Qualité Et Nettoyage

Scripts à utiliser :

```bash
npm run clean
cd frontend && npm run lint
cd frontend && npm run build
```

Dette technique suivie :

- `App.css` reste large et devra être progressivement découpé ;
- le bundle Vite dépasse `500 kB`, optimisation future par code splitting ;
- certains endpoints admin/supplier contiennent encore de la logique métier dans les routeurs ;
- couverture de tests automatisés à renforcer.
