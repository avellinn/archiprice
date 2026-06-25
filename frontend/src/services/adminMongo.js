import { API_ROUTES } from '../constants/api';
import api from './api';
import { notifySupportChange } from './support';

export async function fetchAdminUsers() {
  const { data } = await api.get(API_ROUTES.admin.users);
  return Array.isArray(data) ? data : data.users || [];
}

export async function updateAdminUser(userId, payload) {
  const { data } = await api.patch(API_ROUTES.admin.user(userId), payload);
  return data.user || data;
}

export async function deleteAdminUser(userId) {
  const { data } = await api.delete(API_ROUTES.admin.user(userId));
  return data;
}

export async function permanentDeleteAdminUser(userId) {
  const { data } = await api.delete(API_ROUTES.admin.permanentDeleteUser(userId));
  return data;
}

export async function fetchAdminSuppliers() {
  const { data } = await api.get(API_ROUTES.admin.suppliers);
  return data.suppliers || [];
}

export async function updateAdminSupplier(supplierId, payload) {
  const { data } = await api.put(API_ROUTES.admin.supplier(supplierId), payload);
  return data.supplier;
}

export async function deleteAdminSupplier(supplierId) {
  const { data } = await api.delete(API_ROUTES.admin.supplier(supplierId));
  return data;
}

export async function permanentDeleteAdminSupplier(supplierId) {
  const { data } = await api.delete(API_ROUTES.admin.permanentDeleteSupplier(supplierId));
  return data;
}

export async function fetchAdminProducts() {
  const { data } = await api.get(API_ROUTES.admin.products);
  return data.products || [];
}

export async function updateAdminProduct(productId, payload) {
  const { data } = await api.patch(API_ROUTES.admin.product(productId), payload);
  return data.product;
}

export async function deleteAdminProduct(productId) {
  const { data } = await api.delete(API_ROUTES.admin.product(productId));
  return data;
}

export async function fetchAdminSimulations() {
  const { data } = await api.get(API_ROUTES.admin.simulations);
  return data.simulations || [];
}

export async function deleteAdminSimulation(simulationId) {
  const { data } = await api.delete(API_ROUTES.admin.simulation(simulationId));
  return data;
}

export async function resetAdminSimulations() {
  const { data } = await api.delete(API_ROUTES.admin.simulations);
  return data;
}

export async function fetchAdminSupportItems() {
  const { data } = await api.get(API_ROUTES.admin.supportItems);
  return data.supportItems || [];
}

export async function updateAdminSupportItem(itemId, payload) {
  const { data } = await api.patch(API_ROUTES.admin.supportItem(itemId), payload);
  notifySupportChange({ action: 'updated', supportItem: data.supportItem });
  return data.supportItem;
}

export async function deleteAdminSupportItem(itemId) {
  const { data } = await api.delete(API_ROUTES.admin.supportItem(itemId));
  notifySupportChange({ action: 'deleted', supportItemId: itemId });
  return data;
}
