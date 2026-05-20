# Documentation Frontend ArchiPrice

Ce document décrit la partie frontend du workspace ArchiPrice : son organisation, ses routes, ses composants principaux, le comportement des styles CSS et la meilleure façon de se repérer pour personnaliser l'interface.

## Vue D'ensemble

Le frontend est une application React construite avec Vite.

- Point d'entrée React : `src/main.jsx`
- Composant racine : `src/App.jsx`
- Styles globaux : `src/index.css`
- Styles de pages et du shell applicatif : `src/App.css`
- Pages : `src/pages/`
- Composants réutilisables : `src/components/`
- Services API : `src/services/`
- Authentification : `src/context/`

Les scripts utiles sont définis dans `package.json` :

```bash
npm run dev
npm run build
npm run lint
```

## Routage

Le routage est centralisé dans `src/App.jsx`.

Routes publiques :

- `/` : page d'accueil
- `/login` : connexion
- `/register` : inscription

Routes protégées :

- `/dashboard` : tableau de bord
- `/catalogue` : explorer catalogue
- `/workspace` : mon espace de travail
- `/factures` : factures
- `/deconnexion` : déconnexion

Les routes protégées passent par `ProtectedRoute`, puis sont rendues dans `AppShell`. `AppShell` affiche la structure commune de l'application connectée : sidebar, header, panneaux flottants, puis la page courante via `<Outlet />`.

## Structure Des Pages

`Home.jsx`  
Page publique simple. Si l'utilisateur est déjà authentifié, elle redirige vers `/dashboard`.

`Login.jsx` et `Register.jsx`  
Pages d'authentification. Elles utilisent `AuthLayout`, `react-hook-form`, `PasswordInput`, le contexte d'authentification et les styles de `src/styles/authForm.css`.

`Dashboard.jsx`  
Page de tableau de bord. Elle récupère les projets via `fetchProjects()` puis calcule les statistiques affichées dans les cartes, l'historique et la répartition. La page est conçue comme une vue "one page" sans scroll interne.

`Catalogue.jsx`  
Page de catalogue avec des cartes statiques.

`Workspace.jsx`  
Page de gestion des projets. Elle affiche `ProjectList` et une modale de création de projet.

`Invoices.jsx`  
Page dédiée aux factures.

`Logout.jsx`  
Déclenche la déconnexion via le contexte d'authentification.

## Composants Principaux

`AppShell.jsx`  
Structure principale des pages connectées. Il contrôle :

- l'ouverture et la fermeture du sidebar ;
- le thème clair/sombre ;
- la recherche du header ;
- le panneau de notifications ;
- le menu utilisateur ;
- les entrées de navigation du sidebar.

`Sidebar.jsx`  
Composant de navigation latérale. Les menus sont fournis par `AppShell`. Le style du sidebar est volontairement isolé dans `Sidebar.css`.

`Header.jsx`  
Barre supérieure. Elle affiche le bouton de menu, le fil d'Ariane, la recherche, les actions rapides, les notifications et le menu utilisateur.

`Icon.jsx`  
Composant central pour afficher les icônes utilisées dans l'interface.

`Text.jsx`  
Petit composant typographique pour standardiser les variantes de texte.

`ProjectList.jsx`  
Composant CRUD de projets : chargement, création optionnelle, modification et suppression.

`AuthLayout.jsx`  
Layout visuel commun aux pages d'authentification.

## Services Et Données

`src/services/api.js` crée l'instance Axios principale.

Son comportement :

- utilise l'URL API fournie par `getApiBaseUrl()` ;
- ajoute automatiquement le token JWT dans `Authorization` si un token est stocké ;
- intercepte les erreurs `401` pour supprimer la session locale ;
- expose `getApiErrorMessage()` pour afficher des erreurs lisibles.

`src/services/auth.js` gère les appels de connexion, inscription et récupération de l'utilisateur courant.

`src/services/projects.js` gère les appels API liés aux projets :

- `fetchProjects()`
- `createProject(payload)`
- `updateProject(id, payload)`
- `deleteProject(id)`

`src/services/products.js` est prévu pour les produits ou éléments catalogue.

## Authentification

L'état d'authentification est porté par `AuthProvider` dans `src/context/AuthContext.jsx`.

Il garde :

- `user` : utilisateur courant ;
- `loading` : état de chargement initial ;
- `isAuthenticated` : booléen calculé ;
- `login()` : connexion ;
- `register()` : inscription ;
- `logout()` : suppression de la session.

Au chargement, si un token existe, le frontend appelle `fetchMe()` pour restaurer la session.

## Organisation Des Styles CSS

Le CSS est séparé en plusieurs niveaux.

### 1. Fondations Globales : `src/index.css`

Ce fichier contient les variables globales et les resets de base.

On y trouve notamment :

- polices : `--font-primary`, `--font-heading` ;
- couleurs : `--color-primary`, `--color-secondary`, `--color-danger`, etc. ;
- espacements : `--spacing-xs` à `--spacing-xl` ;
- rayons : `--radius-md`, `--radius-full` ;
- ombres : `--shadow-lg` ;
- règles globales `box-sizing`, `body`, `button`, `input`, `#root`.

C'est le bon endroit pour modifier l'identité visuelle globale de l'application, par exemple la couleur principale ou la police.

Exemple :

```css
:root {
  --color-primary: #0a3764;
  --color-secondary: #ff8a3d;
}
```

### 2. Styles De Layout Et Pages : `src/App.css`

Ce fichier porte une grande partie des styles de structure :

- `.dashboard-shell` : conteneur général des pages connectées ;
- `.dashboard-content` : zone à droite du sidebar ;
- `.dashboard-page` et `.dashboard-grid` : layout du dashboard ;
- `.workspace-page`, `.workspace-heading`, `.workspace-card` : pages internes ;
- `.catalogue-grid`, `.catalogue-item` : catalogue ;
- `.modal-backdrop`, `.project-modal` : modale de projet ;
- classes utilitaires comme `.page`, `.card`, `.btn-primary`, `.muted`, `.actions`.

Le dashboard y est configuré comme une page sans scroll :

```css
.dashboard-content:has(.dashboard-page) {
  height: 100vh;
  overflow: hidden;
}

.dashboard-page {
  height: calc(100vh - 64px);
  overflow: hidden;
}
```

La hauteur `64px` correspond au header fixe.

### 3. Styles Isolés De Composants

Certains composants ont leur propre fichier CSS :

- `Sidebar.css`
- `Header.css`
- `AuthLayout.css`
- `ProjectList.css`
- `Text.css`
- `Icon.css`
- `Avatar.css`
- `PasswordInput.css`
- `styles/authForm.css`

La logique est simple : si un élément appartient clairement à un composant, il faut d'abord chercher son style dans le fichier CSS du composant.

Exemples :

- modifier le menu latéral : `src/components/Sidebar.css`
- modifier la barre haute : `src/components/Header.css`
- modifier les formulaires login/register : `src/styles/authForm.css`
- modifier la carte de connexion : `src/components/AuthLayout.css`
- modifier la liste de projets : `src/components/ProjectList.css`

## Indépendance Du Sidebar

Le sidebar a un style indépendant dans `src/components/Sidebar.css`.

Cela signifie que ses couleurs, espacements, typographies et rayons ne dépendent pas des variables globales CSS. Par exemple, il utilise directement :

```css
background: #0a3764;
color: #ffffff;
border-radius: 8px;
```

Cette séparation permet de modifier `index.css` sans risquer de changer involontairement le rendu du sidebar.

Pour personnaliser le sidebar :

- menus et labels : `src/components/AppShell.jsx`
- rendu HTML : `src/components/Sidebar.jsx`
- style visuel : `src/components/Sidebar.css`
- icônes : `src/components/Icon.jsx`

## Comportement Responsive

Les styles responsives sont principalement placés en bas des fichiers CSS avec des media queries.

Dans `App.css` :

- à moins de `980px`, le contenu n'a plus de marge gauche fixe ;
- les grilles passent en une colonne ;
- les espacements diminuent.

Dans `Sidebar.css` :

- à moins de `1023px`, le sidebar est masqué par défaut avec `transform: translateX(-100%)` ;
- quand il reçoit `.sidebar--open`, il revient à l'écran ;
- à partir de `1024px`, le bouton de fermeture interne est masqué.

Dans `Header.css` :

- à moins de `980px`, le header commence à gauche de l'écran ;
- à moins de `620px`, la recherche et le nom utilisateur sont masqués pour garder une barre compacte.

## Comment Se Repérer Pour Personnaliser

Pour modifier une page :

1. Aller dans `src/pages/`.
2. Ouvrir le fichier de la page concernée.
3. Identifier les classes CSS utilisées dans le JSX.
4. Chercher ces classes dans `src/App.css` ou dans le CSS du composant utilisé.

Pour modifier un composant réutilisable :

1. Aller dans `src/components/`.
2. Ouvrir le composant `.jsx`.
3. Ouvrir son fichier `.css` associé s'il existe.
4. Modifier les classes locales du composant.

Pour modifier les couleurs globales :

1. Ouvrir `src/index.css`.
2. Modifier les variables dans `:root`.
3. Vérifier les composants qui n'utilisent pas ces variables, notamment le sidebar.

Pour modifier la navigation :

1. Ouvrir `src/components/AppShell.jsx`.
2. Modifier le tableau `sidebarSections`.
3. Vérifier que la route existe dans `src/App.jsx`.

Pour modifier une route :

1. Ajouter ou modifier la page dans `src/pages/`.
2. Déclarer la route dans `src/App.jsx`.
3. Ajouter l'entrée de menu dans `AppShell.jsx` si nécessaire.

Pour modifier les appels API :

1. Vérifier les routes dans `src/constants/api.js`.
2. Modifier ou ajouter la fonction dans `src/services/`.
3. Appeler le service depuis la page ou le composant concerné.

## Convention De Nommage CSS

Le projet utilise souvent une convention proche de BEM pour les composants :

```css
.sidebar
.sidebar__header
.sidebar__nav-link
.sidebar__nav-link--active
```

Lecture rapide :

- `bloc` : composant principal ;
- `bloc__element` : élément interne ;
- `bloc__element--modifier` : variante ou état.

Cette convention aide à éviter les conflits entre composants.

## Points D'Attention

Le header et le sidebar sont fixes. Quand on modifie leur largeur ou leur hauteur, il faut aussi vérifier :

- `left: 280px` dans `Header.css` ;
- `margin-left: 280px` dans `App.css` ;
- `height: 64px` dans `Header.css` ;
- `height: calc(100vh - 64px)` dans `App.css`.

Le dashboard est volontairement sans scroll. Si de nouveaux blocs sont ajoutés à `Dashboard.jsx`, il faut ajuster :

- `.dashboard-grid`
- les `grid-template-columns`
- les `grid-template-rows`
- les `gap`
- les `padding`
- les hauteurs des graphiques.

Les styles du sidebar sont indépendants. Modifier une variable dans `index.css` ne changera pas automatiquement le sidebar.

## Checklist Avant Modification Visuelle

- Identifier le composant ou la page concernée.
- Vérifier si le style est dans un CSS local ou dans `App.css`.
- Modifier les variables globales uniquement pour les choix partagés par toute l'application.
- Tester les tailles desktop, tablette et mobile.
- Lancer `npm run lint`.
- Lancer `npm run build`.
