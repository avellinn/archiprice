# Roadmap ArchiPrice

Dernière mise à jour : 2026-05-22

## État Global

ArchiPrice dispose maintenant :

- d'une API Express/Mongoose ;
- d'une authentification JWT ;
- d'un rôle utilisateur/admin ;
- d'une interface utilisateur protégée ;
- d'une interface admin protégée ;
- d'un catalogue produits côté frontend ;
- d'un workspace projet dynamique ;
- d'un design system partagé ;
- d'une documentation frontend et workspace mise à jour.

## Progression

| Étape | Objectif | Statut |
|-------|----------|--------|
| 0 | Fondations backend, Express, MongoDB, env | Terminé |
| 1 | Authentification JWT | Terminé |
| 2 | CRUD projets | Terminé |
| 3 | CRUD produits liés aux projets | Terminé |
| 4 | Interface utilisateur principale | Terminé |
| 5 | Dashboard one-page et stats projets | Terminé |
| 6 | Catalogue produits avec simulation budget | En cours |
| 7 | Workspace projet détaillé | En cours |
| 8 | Rôle admin + routes admin | En cours |
| 9 | Design system partagé user/admin | En cours |
| 10 | Pages admin métier complètes | À faire |

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

## Interface Admin

Routes en place :

- `/admin/dashboard`
- `/admin/catalogue/products`
- `/admin/catalogue/filters`
- `/admin/suppliers`
- `/admin/users`
- `/admin/simulations`
- `/admin/support/tickets`
- `/admin/support/feedback`
- `/admin/support/price-reports`
- `/admin/settings/simulations`
- `/admin/settings/regional-coefficients`

Menus admin :

- Tableau de bord
- Catalogue
  - Produits
  - Catégories & filtres
- Fournisseurs
- Utilisateurs
- Simulations
- Support
  - Tickets
  - Feedback
  - Signalements prix
- Paramètres
  - Configuration simulations
  - Coefficients régionaux
- Déconnexion

À faire :

- remplacer les placeholders par des pages métier ;
- ajouter CRUD produits admin ;
- ajouter CRUD fournisseurs ;
- ajouter suivi simulations ;
- ajouter gestion support ;
- ajouter configuration simulation et coefficients régionaux.

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
- `PUT /api/admin/users/:id/role`

À faire :

- endpoints admin produits ;
- endpoints admin catégories/filtres ;
- endpoints fournisseurs ;
- endpoints simulations ;
- endpoints support ;
- endpoints paramètres.

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
- routes et menus par rôle ;
- contenus métier par rôle.

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
- les pages admin hors utilisateurs sont encore des placeholders.
