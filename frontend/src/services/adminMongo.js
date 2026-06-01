import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchAdminUsers() {
  const { data } = await api.get(API_ROUTES.admin.users);
  return Array.isArray(data) ? data : data.users || [];
}

export async function createAdminUser(payload) {
  const { data } = await api.post(API_ROUTES.admin.users, payload);
  return data.user || data;
}

export async function updateAdminUser(userId, payload) {
  const { data } = await api.patch(API_ROUTES.admin.user(userId), payload);
  return data.user || data;
}

export async function deleteAdminUser(userId) {
  const { data } = await api.delete(API_ROUTES.admin.user(userId));
  return data;
}

export async function fetchAdminSuppliers() {
  const { data } = await api.get(API_ROUTES.admin.suppliers);
  return data.suppliers || [];
}

export async function createAdminSupplier(payload) {
  const { data } = await api.post(API_ROUTES.admin.suppliers, payload);
  return data.supplier;
}

export async function updateAdminSupplier(supplierId, payload) {
  const { data } = await api.put(API_ROUTES.admin.supplier(supplierId), payload);
  return data.supplier;
}

export async function deleteAdminSupplier(supplierId) {
  const { data } = await api.delete(API_ROUTES.admin.supplier(supplierId));
  return data;
}

export async function fetchAdminSimulations() {
  const { data } = await api.get(API_ROUTES.admin.simulations);
  return data.simulations || [];
}

export async function updateAdminSimulation(simulationId, payload) {
  const { data } = await api.patch(API_ROUTES.admin.simulation(simulationId), payload);
  return data.simulation;
}

export async function fetchAdminSupportItems() {
  const { data } = await api.get(API_ROUTES.admin.supportItems);
  return data.supportItems || [];
}

export async function updateAdminSupportItem(itemId, payload) {
  const { data } = await api.patch(API_ROUTES.admin.supportItem(itemId), payload);
  return data.supportItem;
}

export async function fetchSupplierRequests() {
  const { data } = await api.get(API_ROUTES.admin.supplierRequests);
  return data.requests || [];
}

export async function approveSupplierRequest(requestId) {
  const { data } = await api.post(API_ROUTES.admin.approveSupplierRequest(requestId));
  return data;
}

export async function rejectSupplierRequest(requestId, reason = '') {
  const { data } = await api.post(API_ROUTES.admin.rejectSupplierRequest(requestId), { reason });
  return data.request;
}
