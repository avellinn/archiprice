import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchCatalogueProducts() {
  const { data } = await api.get(API_ROUTES.catalogue.products);
  return Array.isArray(data.products) ? data.products : [];
}
