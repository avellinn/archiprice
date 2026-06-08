import api from './api';

const CATALOGUE_IMAGE_UPLOAD_TIMEOUT = 120000;

export async function uploadCatalogueImages(files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('image', file);
  });

  const { data } = await api.post('/api/uploads/products/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: CATALOGUE_IMAGE_UPLOAD_TIMEOUT,
  });

  return Array.isArray(data.images) ? data.images : [];
}

export async function deleteCatalogueImage(publicId) {
  const { data } = await api.delete('/api/uploads/products/images', {
    data: { publicId },
  });

  return data;
}
