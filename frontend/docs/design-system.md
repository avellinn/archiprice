# Design System Et Layouts Par Rôle

ArchiPrice suit une règle simple pour toutes les interfaces :

**70 à 80% mutualisé, 20 à 30% spécifique au rôle.**

L'objectif est de garder une expérience uniforme tout en permettant aux interfaces utilisateur et administrateur d'avoir leur propre structure métier.

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
- loader ;
- empty states ;
- icônes ;
- typographie ;
- avatar ;
- header ;
- sidebar.

Ces composants vivent dans `src/components/` et doivent être réutilisés par les pages user et admin.

Exemples actuels :

- `Button.jsx` et `Button.css`
- `Text.jsx` et `Text.css`
- `Icon.jsx` et `Icon.css`
- `components/ui/Badge.jsx`
- `components/ui/Card.jsx`
- `components/ui/DataTable.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Pagination.jsx`
- `Header.jsx` et `Header.css`
- `Sidebar.jsx` et `Sidebar.css`
- `Avatar.jsx` et `Avatar.css`
- `ModalCreateProject.jsx` et `ModalCreateProject.css`
- `DonutChart.jsx` et `DonutChart.css`

Les nouveaux composants génériques doivent être créés dans `src/components/ui/` lorsqu'ils ne dépendent pas d'un domaine métier.

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

Si c'est générique, il doit aller dans `src/components/` et être pensé pour user + admin.

Pour les composants UI purs, préférer :

```txt
src/components/ui/NomDuComposant.jsx
src/components/ui/ui.css
```

Pour les composants historiques déjà partagés (`Button`, `Icon`, `Text`, `Sidebar`, `Header`), conserver leur emplacement actuel dans `src/components/`.

Si c'est métier, il peut rester dans la page concernée ou dans un composant dédié au domaine.

Si c'est une structure de rôle, il doit être placé dans un shell spécifique, par exemple `AppShell.jsx` ou `AdminShell.jsx`.

## Exemple De Bonne Séparation

`Sidebar.jsx` est partagé.

`AppShell.jsx` fournit les menus user.

`AdminShell.jsx` fournit les menus admin.

`Sidebar.css` contient la base commune et les variantes de rôle minimales :

- `.sidebar--user`
- `.sidebar--admin`

Ainsi, le composant reste unique, les styles restent uniformes, et seul le contenu du layout s'adapte au rôle.

Comportements partagés :

- sous-menus ouverts au survol ;
- sous-menus contrôlables au clic ;
- état actif basé sur la route ;
- support dark mode ;
- footer utilisateur/admin basé sur les mêmes classes.

## Pourquoi Cette Règle Existe

Cette organisation garantit :

- cohérence UX ;
- maintenance plus simple ;
- moins de duplication ;
- évolution plus rapide ;
- styles plus faciles à retrouver ;
- interfaces admin et user uniformes sans être identiques.
- styles CSS cohérents entre admin et user.

## À Éviter

- Dupliquer un bouton admin si `Button.jsx` suffit.
- Créer une deuxième sidebar complète pour l'admin.
- Donner à l'admin une identité CSS séparée si le composant partagé suffit.
- Ajouter des styles globaux trop larges pour un cas isolé.
- Mettre de la logique admin dans `AppShell.jsx`.
- Mettre de la logique user dans `AdminShell.jsx`.
- Mélanger les routes admin et user dans un même layout.

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
