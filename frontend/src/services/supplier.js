import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchSupplierWorkspace() {
  const { data } = await api.get(API_ROUTES.supplier.workspace);
  return data;
}

export async function createSupplierProduct(payload, files = []) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  files.forEach((file) => {
    formData.append('image', file);
  });

  const { data } = await api.post(API_ROUTES.supplier.products, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data.product;
}

export async function updateSupplierProduct(productId, payload, files = []) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  files.forEach((file) => {
    formData.append('image', file);
  });

  const { data } = await api.put(API_ROUTES.supplier.product(productId), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data.product;
}

export async function deleteSupplierProduct(productId) {
  await api.delete(API_ROUTES.supplier.product(productId));
}

export async function deleteSupplierProductImage(productId, publicId) {
  const { data } = await api.delete(API_ROUTES.supplier.productImages(productId), {
    data: { publicId },
  });

  return data.product;
}
