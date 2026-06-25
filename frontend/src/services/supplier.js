import { API_ROUTES } from '../constants/api';
import api from './api';

export const SUPPLIER_WORKSPACE_EVENT = 'archiprice:supplier-workspace-change';
const SUPPLIER_WORKSPACE_CHANNEL = 'archiprice-supplier-workspace';
const SUPPLIER_UPLOAD_TIMEOUT = 135000;

function getSupplierWorkspaceChannel() {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') {
    return null;
  }

  return new window.BroadcastChannel(SUPPLIER_WORKSPACE_CHANNEL);
}

export function notifySupplierWorkspaceChange(detail = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    at: new Date().toISOString(),
    ...detail,
  };

  window.dispatchEvent(new CustomEvent(SUPPLIER_WORKSPACE_EVENT, { detail: payload }));

  const channel = getSupplierWorkspaceChannel();
  if (channel) {
    channel.postMessage(payload);
    channel.close();
  }
}

export function subscribeSupplierWorkspaceChange(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleWindowEvent = (event) => callback(event.detail);
  window.addEventListener(SUPPLIER_WORKSPACE_EVENT, handleWindowEvent);

  const channel = getSupplierWorkspaceChannel();
  if (channel) {
    channel.addEventListener('message', (event) => callback(event.data));
  }

  return () => {
    window.removeEventListener(SUPPLIER_WORKSPACE_EVENT, handleWindowEvent);
    channel?.close();
  };
}

export async function fetchSupplierWorkspace() {
  const { data } = await api.get(API_ROUTES.supplier.workspace);
  return data;
}

export async function fetchSupplierProfile() {
  const { data } = await api.get(API_ROUTES.supplier.me);
  return data.supplier;
}

export async function fetchSupplierProducts() {
  const { data } = await api.get(API_ROUTES.supplier.products);
  return Array.isArray(data.products) ? data.products : [];
}

export async function fetchSupplierFiles() {
  const { data } = await api.get(API_ROUTES.supplier.files);
  return Array.isArray(data.files) ? data.files : [];
}

export async function uploadSupplierFiles(files = []) {
  const formData = new FormData();
  files.forEach((file) => formData.append('file', file));
  const { data } = await api.post(API_ROUTES.supplier.files, formData, {
    timeout: SUPPLIER_UPLOAD_TIMEOUT,
  });
  notifySupplierWorkspaceChange({ action: 'upload-files' });
  return Array.isArray(data.files) ? data.files : [];
}

export async function deleteSupplierFile(fileId) {
  const { data } = await api.delete(`${API_ROUTES.supplier.files}/${fileId}`);
  notifySupplierWorkspaceChange({ action: 'delete-file', fileId });
  return Array.isArray(data.files) ? data.files : [];
}

export async function resetSupplierFiles() {
  const { data } = await api.delete(API_ROUTES.supplier.files);
  notifySupplierWorkspaceChange({ action: 'reset-files' });
  return Array.isArray(data.files) ? data.files : [];
}

export async function updateSupplierProfile(payload) {
  const { data } = await api.put(API_ROUTES.supplier.me, payload);
  notifySupplierWorkspaceChange({ action: 'update-supplier-profile', supplierId: data.supplier?.id });
  return data.supplier;
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
    timeout: SUPPLIER_UPLOAD_TIMEOUT,
  });

  notifySupplierWorkspaceChange({ action: 'create-product', productId: data.product?.id });
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
    timeout: SUPPLIER_UPLOAD_TIMEOUT,
  });

  notifySupplierWorkspaceChange({ action: 'update-product', productId });
  return data.product;
}

export async function deleteSupplierProduct(productId) {
  await api.delete(API_ROUTES.supplier.product(productId));
  notifySupplierWorkspaceChange({ action: 'delete-product', productId });
}

export async function updateSupplierProductPublication(productId, publicationStatus) {
  const { data } = await api.patch(API_ROUTES.supplier.productPublication(productId), { publicationStatus });
  notifySupplierWorkspaceChange({ action: 'update-product-publication', productId, publicationStatus });
  return data.product;
}

export async function deleteSupplierProductImage(productId, publicId) {
  const { data } = await api.delete(API_ROUTES.supplier.productImages(productId), {
    data: { publicId },
  });

  notifySupplierWorkspaceChange({ action: 'delete-product-image', productId, publicId });
  return data.product;
}
