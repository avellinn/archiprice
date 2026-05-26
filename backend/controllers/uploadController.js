import {
  deleteProductImage,
  uploadProductImages,
} from '../services/cloudinaryImageService.js';

async function uploadImages(req, res) {
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ error: 'Aucune image fournie' });
  }

  const images = await uploadProductImages(files, { source: 'admin-catalogue' });

  return res.status(201).json({ images });
}

async function deleteImage(req, res) {
  const { publicId } = req.body;
  const result = await deleteProductImage(publicId);

  return res.json({
    message: 'Image supprimée',
    result,
  });
}

export { deleteImage, uploadImages };
