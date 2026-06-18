import { API_ROUTES } from '../constants/api';
import api from './api';
import { getCurrentStorageScope, getScopedStorageKey } from './scopedStorage';

const LOCAL_PROJECT_PRODUCTS_KEY = 'archiprice_local_project_products';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalProjectProducts() {
  if (!canUseBrowserStorage()) return {};

  try {
    const storageScope = getCurrentStorageScope();
    const storageKey = storageScope === 'anonymous'
      ? LOCAL_PROJECT_PRODUCTS_KEY
      : getScopedStorageKey(LOCAL_PROJECT_PRODUCTS_KEY);
    const products = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    return products && typeof products === 'object' ? products : {};
  } catch {
    return {};
  }
}

function writeLocalProjectProducts(productsByProject) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(getScopedStorageKey(LOCAL_PROJECT_PRODUCTS_KEY), JSON.stringify(productsByProject));
  } catch {
    window.localStorage.removeItem(getScopedStorageKey(LOCAL_PROJECT_PRODUCTS_KEY));
  }
}

function getLocalProducts(projectId) {
  const productsByProject = readLocalProjectProducts();
  const products = productsByProject[projectId];

  return Array.isArray(products) ? products : [];
}

function setLocalProducts(projectId, products) {
  writeLocalProjectProducts({
    ...readLocalProjectProducts(),
    [projectId]: products,
  });
}

function mergeProducts(remoteProducts = [], localProducts = []) {
  const productsById = new Map();

  [...localProducts, ...remoteProducts].forEach((product) => {
    if (product?.id) productsById.set(product.id, product);
  });

  return [...productsById.values()];
}

function createLocalProduct(payload) {
  return {
    id: `local-product-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: payload.name,
    description: payload.description || '',
    category: payload.category || '',
    unit: payload.unit || 'u',
    unitPrice: payload.unitPrice || 0,
    images: Array.isArray(payload.images) ? payload.images : [],
  };
}

export async function fetchProducts(projectId) {
  try {
    const { data } = await api.get(API_ROUTES.products.list(projectId), { skipUnauthorizedHandler: true });
    return mergeProducts(data.products || [], getLocalProducts(projectId));
  } catch {
    return getLocalProducts(projectId);
  }
}

export async function createProduct(projectId, payload) {
  try {
    const { data } = await api.post(API_ROUTES.products.list(projectId), payload, { skipUnauthorizedHandler: true });
    setLocalProducts(projectId, mergeProducts([data.product], getLocalProducts(projectId)));
    return data.product;
  } catch {
    const product = createLocalProduct(payload);
    setLocalProducts(projectId, [...getLocalProducts(projectId), product]);
    return product;
  }
}

export async function updateProduct(projectId, productId, payload) {
  const updateLocalProduct = () => {
    const products = getLocalProducts(projectId).map((product) => (
      product.id === productId ? { ...product, ...payload } : product
    ));
    const product = products.find((item) => item.id === productId);
    setLocalProducts(projectId, products);
    return product;
  };

  if (String(productId).startsWith('local-product-')) {
    return updateLocalProduct();
  }

  try {
    const { data } = await api.put(API_ROUTES.products.detail(projectId, productId), payload);
    setLocalProducts(projectId, getLocalProducts(projectId).map((product) => (
      product.id === productId ? data.product : product
    )));
    return data.product;
  } catch {
    return updateLocalProduct();
  }
}

export async function deleteProduct(projectId, productId) {
  const deleteLocalProduct = () => {
    setLocalProducts(projectId, getLocalProducts(projectId).filter((product) => product.id !== productId));
    return { message: 'Produit supprimé' };
  };

  if (String(productId).startsWith('local-product-')) {
    return deleteLocalProduct();
  }

  const { data } = await api.delete(API_ROUTES.products.detail(projectId, productId));
  deleteLocalProduct();
  return data;
}
