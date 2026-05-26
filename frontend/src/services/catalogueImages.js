import api from './api';

export async function uploadCatalogueImages(files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('image', file);
  });

  const { data } = await api.post('/api/uploads/products/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return Array.isArray(data.images) ? data.images : [];
}

export async function deleteCatalogueImage(publicId) {
  const { data } = await api.delete('/api/uploads/products/images', {
    data: { publicId },
  });

  return data;
}
