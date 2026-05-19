import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchProducts(projectId) {
  const { data } = await api.get(API_ROUTES.products.list(projectId));
  return data.products;
}

export async function createProduct(projectId, payload) {
  const { data } = await api.post(API_ROUTES.products.list(projectId), payload);
  return data.product;
}

export async function updateProduct(projectId, productId, payload) {
  const { data } = await api.put(API_ROUTES.products.detail(projectId, productId), payload);
  return data.product;
}

export async function deleteProduct(projectId, productId) {
  const { data } = await api.delete(API_ROUTES.products.detail(projectId, productId));
  return data;
}
