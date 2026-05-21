# Audit Et Nettoyage Du Workspace

Date : 2026-05-21

## Synthèse

Le workspace contient une application fullstack :

- backend Express/Mongoose ;
- frontend React/Vite ;
- documentation projet ;
- scripts utilitaires.

Le plus gros volume disque vient des dépendances installées localement :

- `frontend/node_modules` : environ 171 Mo ;
- `backend/node_modules` : environ 20 Mo.

Ces dossiers sont ignorés par Git et nécessaires pour travailler localement. Ils n'ont pas été supprimés.

## Nettoyage Effectué

Fichiers et dossiers générés supprimés :

- `frontend/dist`
- `frontend/node_modules/.vite`
- `frontend/node_modules/.vite-temp`
- `frontend/node_modules/.tmp`
- `backend/node_modules/.cache` si présent

Code mort supprimé :

- `frontend/src/components/ProjectList.jsx`
- `frontend/src/components/ProjectList.css`

Raison : le composant `ProjectList` n'était plus importé par l'application. Les parcours projets actuels passent par `Dashboard.jsx`, `Workspace.jsx`, `EspacePro` et les services `projects.js`.

CSS nettoyé :

- retrait des anciens styles du catalogue type vidéo/Vimeo ;
- conservation uniquement des styles nécessaires au catalogue produits actuel.

Configuration mise à jour :

- `package.json` : script `clean` enrichi avec les caches Vite temporaires ;
- `.gitignore` : ajout de `.vite-temp/`, `.tmp/`, `.cache/`.

## État Actuel Des Zones Front

Pages principales :

- `Dashboard.jsx` : statistiques, activité, projets récents, donut chart, CTA nouveau projet.
- `Catalogue.jsx` : filtres produits, cartes produits, simulation budget sticky.
- `Workspace.jsx` : cards d'accès, mode miniature, espace projet, bouton `Où acheter`.
- `Invoices.jsx` : documents exportés.
- `Logout.jsx` : page de confirmation de déconnexion.

Composants structurants :

- `AppShell.jsx`
- `Sidebar.jsx`
- `Header.jsx`
- `Button.jsx`
- `Icon.jsx`
- `DonutChart.jsx`
- `WorkspaceMiniGrid.jsx`
- `espacepro.jsx`
- `ModalCreateProject.jsx`

## Points D'Attention

`frontend/src/App.css` reste le fichier CSS le plus lourd car il porte plusieurs pages. À moyen terme, l'optimisation la plus propre serait de déplacer les styles de pages dans :

- `src/pages/Dashboard.css`
- `src/pages/Catalogue.css`
- `src/pages/Workspace.css`

Cela réduirait la charge cognitive et faciliterait les personnalisations.

Le build Vite signale un chunk JS supérieur à 500 kB. Ce n'est pas bloquant. Une future optimisation pourrait utiliser `React.lazy()` et le code splitting par route.

## Commandes De Contrôle

Depuis la racine :

```bash
npm run clean
```

Depuis `frontend/` :

```bash
npm run lint
npm run build
```

## Ce Qui N'a Pas Été Supprimé

Non supprimé volontairement :

- `node_modules/` : utile au dev local, déjà ignoré par Git ;
- `.env` : fichier local sensible, ignoré par Git ;
- `frontend/dist` après vérification build : peut être régénéré par `npm run build`.

Pour un nettoyage disque plus agressif, supprimer manuellement les dépendances :

```bash
rm -rf frontend/node_modules backend/node_modules
```

Puis réinstaller :

```bash
npm run install:all
```
