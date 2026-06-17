# Design System Et Layouts Par Rôle

ArchiPrice suit une règle simple pour toutes les interfaces :

**70 à 80% mutualisé, 20 à 30% spécifique au rôle.**

L'objectif est de garder une expérience uniforme tout en permettant aux interfaces utilisateur, administrateur et fournisseur d'avoir leur propre structure métier.

## Ce Qui Est Partagé

Les composants UI génériques doivent rester communs à toute l'application.

Exemples :

- boutons ;
- inputs ;
- selects ;
- tables ;
- modals ;
- cards ;
- dropdowns ;
- badges ;
- pagination ;
- upload image ;
- date picker ;
- notifications ;
- alertes applicatives ;
- loader ;
- empty states ;
- icônes ;
- typographie ;
- avatar ;
- header ;
- sidebar.

Ces composants vivent dans `src/components/` et `src/components/ui/` et doivent être réutilisés par les pages user, admin et supplier.

Exemples actuels :

- `Button.jsx` et `Button.css`
- `Text.jsx` et `Text.css`
- `Icon.jsx` et `Icon.css`
- `components/ui/Badge.jsx`
- `components/ui/Card.jsx`
- `components/ui/DataTable.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Pagination.jsx`
- `components/ui/Alert.jsx`
- `components/ui/Table.jsx`
- `components/ui/ServerError.jsx`
- `Header.jsx` et `Header.css`
- `Sidebar.jsx` et `Sidebar.css`
- `Avatar.jsx` et `Avatar.css`
- `Newproject.jsx` et `Newproject.css`, avec `ModalCreateProject.jsx` comme wrapper de compatibilité
- `DonutChart.jsx` et `DonutChart.css`

Les nouveaux composants génériques doivent être créés dans `src/components/ui/` lorsqu'ils ne dépendent pas d'un domaine métier.

Les modals génériques doivent être rangées dans `src/components/ui/modals/`. Une modale métier transverse peut rester dans `src/components/`, par exemple `modalBoutique.jsx`.

`src/pages/admin/PageShell.jsx` peut réexporter certains composants partagés pour préserver les imports admin existants, mais la source de vérité doit rester dans `src/components/ui/`.

## Ce Qui Est Spécifique Au Rôle

Les layouts, routes, menus et pages métier peuvent être spécifiques.

Interface utilisateur :

- layout : `AppShell.jsx`
- routes protégées user : `ProtectedRoute.jsx`
- pages : dashboard, catalogue, workspace, estimations, déconnexion.

Interface admin :

- layout : `AdminShell.jsx`
- route protégée admin : `AdminRoute.jsx`
- pages : dashboard admin, produits, catégories & filtres, fournisseurs, utilisateurs, simulations, support, paramètres.

Interface supplier :

- layout : `SupplierShell.jsx`
- route protégée supplier : `SupplierRoute.jsx`
- pages : analyses de données, ma boutique, produits, ajout produit, clients, fichiers, paramètres.

Un layout spécifique peut personnaliser :

- la structure de navigation ;
- les libellés de menus ;
- les routes ;
- les états de recherche ou notifications ;
- une variante de rôle minimale, sans changer le langage visuel global.

## Règle D'Implémentation

Avant de créer un nouveau composant, vérifier s'il s'agit :

1. d'un composant UI générique ;
2. d'un bloc métier spécifique à une page ;
3. d'un layout propre à un rôle.

Si c'est générique, il doit aller dans `src/components/` ou `src/components/ui/` et être pensé pour user + admin + supplier.

Pour les composants UI purs, préférer :

```txt
src/components/ui/NomDuComposant.jsx
src/components/ui/ui.css
```

Pour les composants historiques déjà partagés (`Button`, `Icon`, `Text`, `Sidebar`, `Header`), conserver leur emplacement actuel dans `src/components/`.

Si c'est métier, il peut rester dans la page concernée ou dans un composant dédié au domaine.

Si c'est une structure de rôle, il doit être placé dans un shell spécifique, par exemple `AppShell.jsx`, `AdminShell.jsx` ou `SupplierShell.jsx`.

## Exemple De Bonne Séparation

`Sidebar.jsx` est partagé.

`AppShell.jsx` fournit les menus user.

`AdminShell.jsx` fournit les menus admin.

`SupplierShell.jsx` fournit les menus fournisseur.

`Sidebar.css` contient la base commune et les variantes de rôle minimales :

- `.sidebar--user`
- `.sidebar--admin`
- `.sidebar--supplier`

Ainsi, le composant reste unique, les styles restent uniformes, et seul le contenu du layout s'adapte au rôle.

Comportements partagés :

- sous-menus ouverts au survol ;
- sous-menus contrôlables au clic ;
- état actif basé sur la route ;
- support dark mode ;
- footer utilisateur/admin/supplier basé sur les mêmes classes.

Le dark mode est piloté par `.dashboard-shell.is-theme-dark` et par les variables `--app-*` définies dans `App.css`. Les pages ne doivent pas forcer un fond global clair qui empêcherait le thème de s'appliquer.

Le logo n'a plus de composant dédié. `log.png` est rendu directement par les layouts, et les styles doivent vivre dans les CSS du conteneur qui l'affiche :

- sidebar : `components/Sidebar.css` ;
- header public : `components/Header.css` ;
- auth layout : `components/AuthLayout.css`.

Ne pas recréer de `Logo.jsx`/`Logo.css` pour le dark mode : ajouter les règles au conteneur actif afin que le thème reste contrôlé par le shell.

## Messages Et Alertes

Les messages applicatifs doivent utiliser `components/ui/Alert.jsx`.

À utiliser pour :

- erreurs API ;
- confirmations non bloquantes ;
- notifications de succès ;
- avertissements métier ;
- états d'attente visibles.

À éviter dans les workflows admin :

- `window.alert` ;
- `window.confirm` ;
- `window.prompt`.

Quand une saisie est nécessaire, créer une modale React avec un formulaire.

## Pourquoi Cette Règle Existe

Cette organisation garantit :

- cohérence UX ;
- maintenance plus simple ;
- moins de duplication ;
- évolution plus rapide ;
- styles plus faciles à retrouver ;
- interfaces user, admin et supplier uniformes sans être identiques.
- styles CSS cohérents entre user, admin et supplier.

## À Éviter

- Dupliquer un bouton admin si `Button.jsx` suffit.
- Créer une deuxième sidebar complète pour l'admin.
- Donner à l'admin une identité CSS séparée si le composant partagé suffit.
- Ajouter des styles globaux trop larges pour un cas isolé.
- Mettre de la logique admin dans `AppShell.jsx`.
- Mettre de la logique user dans `AdminShell.jsx`.
- Mélanger les routes admin et user dans un même layout.
- Ajouter une alerte navigateur alors que `Alert.jsx` existe.
- Ajouter un style clair fixe qui ignore `is-theme-dark`.

## Checklist Sprint UI

Avant de livrer une nouvelle interface :

```bash
cd frontend
npm run lint
npm run build
```

Puis vérifier :

- le composant UI est-il partagé si possible ?
- le layout est-il spécifique au bon rôle ?
- la route est-elle protégée par le bon guard ?
- le style est-il dans le bon fichier CSS ?
- le dark mode reste-t-il cohérent ?
- l'interface admin n'utilise-t-elle pas accidentellement le shell user ?
- l'interface supplier utilise-t-elle bien `SupplierShell.jsx` ?
- les messages passent-ils par `Alert.jsx` ?
