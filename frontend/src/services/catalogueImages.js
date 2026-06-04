import api from './api';
import { MAX_FILES_PER_UPLOAD } from '../constants/uploads';

export async function uploadCatalogueImages(files) {
  const formData = new FormData();

  files.slice(0, MAX_FILES_PER_UPLOAD).forEach((file) => {
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
