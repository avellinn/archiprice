# Upload images Cloudinary

Les images des articles sont stockées uniquement sur Cloudinary. Le backend ne sauvegarde aucun fichier temporaire sur disque.

## Variables requises

Ajouter ces valeurs dans `.env` :

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Architecture

```txt
backend/config/cloudinary.js
backend/middleware/multerUpload.js
backend/services/cloudinaryImageService.js
backend/controllers/uploadController.js
backend/routes/uploads.js
backend/models/Product.js
```

## Flux

1. React envoie un `FormData` avec un ou plusieurs champs `image`.
2. `multer.memoryStorage()` valide et garde les fichiers en mémoire.
3. Le service Cloudinary streame chaque buffer vers `archiprice/products`.
4. Le backend retourne uniquement `secure_url`, `public_id` et `metadata`.
5. MongoDB stocke ces objets dans `Product.images`.
6. Lors d’une suppression d’image ou d’article, le backend supprime aussi le `public_id` Cloudinary.

## Endpoints

```txt
POST   /api/uploads/products/images
DELETE /api/uploads/products/images
DELETE /api/projects/:projectId/products/:id/images
```

Le `POST` accepte jusqu’à 10 images, chacune en PNG, JPG ou WebP, avec une taille maximale de 5 Mo.

## Exemple React upload

```jsx
const formData = new FormData();
files.forEach((file) => formData.append('image', file));

const { data } = await api.post('/api/uploads/products/images', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

setImages(data.images);
```

## Exemple preview

```jsx
{images.map((image) => (
  <img key={image.public_id} src={image.secure_url} alt="" />
))}
```

## Bonnes pratiques

- Garder les secrets Cloudinary uniquement côté backend.
- Valider MIME type et taille côté serveur.
- Ne jamais enregistrer de base64 en MongoDB.
- Stocker seulement `secure_url`, `public_id` et les métadonnées utiles.
- Supprimer les assets Cloudinary lors de la suppression d’un article.
- Utiliser les transformations Cloudinary `fetch_format: auto` et `quality: auto`.
- En production, protéger les endpoints d’upload/suppression par une route admin.
