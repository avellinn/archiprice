import { API_ROUTES } from '../constants/api';
import api from './api';

const CACHE_TTL_MS = 15000;
let catalogueCache = { products: [], expiresAt: 0 };
let catalogueRequest = null;
const productCache = new Map();

export async function fetchCatalogueProducts({ force = false } = {}) {
  const now = Date.now();
  if (!force && catalogueCache.expiresAt > now) return catalogueCache.products;
  if (!force && catalogueRequest) return catalogueRequest;

  catalogueRequest = api.get(API_ROUTES.catalogue.products)
    .then(({ data }) => {
      const products = Array.isArray(data.products) ? data.products : [];
      catalogueCache = { products, expiresAt: Date.now() + CACHE_TTL_MS };
      products.forEach((product) => {
        const id = product.id || product._id;
        if (id) productCache.set(String(id), { product, expiresAt: catalogueCache.expiresAt });
      });
      return products;
    })
    .finally(() => { catalogueRequest = null; });

  return catalogueRequest;
}

export async function fetchCatalogueProduct(productId, { force = false } = {}) {
  const cached = productCache.get(String(productId));
  if (!force && cached?.expiresAt > Date.now()) return cached.product;
  const { data } = await api.get(API_ROUTES.catalogue.product(productId));
  const product = data.product || null;
  if (product) productCache.set(String(productId), { product, expiresAt: Date.now() + CACHE_TTL_MS });
  return product;
}
