import { API_ROUTES } from '../constants/api';
import api from './api';

function purgeLegacyProjectProductsStorage() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;

  try {
    Object.keys(window.localStorage)
      .filter((key) => key.includes('archiprice_local_project_products'))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Le nettoyage est opportuniste: l'API reste la source de vérité.
  }
}

purgeLegacyProjectProductsStorage();

export async function fetchProducts(projectId) {
  const { data } = await api.get(API_ROUTES.products.list(projectId), { skipUnauthorizedHandler: true });
  return Array.isArray(data.products) ? data.products : [];
}

export async function createProduct(projectId, payload) {
  const { data } = await api.post(API_ROUTES.products.list(projectId), payload, { skipUnauthorizedHandler: true });
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
