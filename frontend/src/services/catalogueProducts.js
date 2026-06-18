import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchCatalogueProducts() {
  const { data } = await api.get(API_ROUTES.catalogue.products);
  return Array.isArray(data.products) ? data.products : [];
}

export async function fetchCatalogueProduct(productId) {
  const { data } = await api.get(API_ROUTES.catalogue.product(productId));
  return data.product || null;
}

export async function fetchCatalogueFilters() {
  const { data } = await api.get(API_ROUTES.catalogue.filters);
  return data.filters || null;
}
