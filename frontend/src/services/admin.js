import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchAdminUsers() {
  const { data } = await api.get(API_ROUTES.admin.users);
  return data;
}

export async function updateAdminUserRole(userId, role) {
  const { data } = await api.put(API_ROUTES.admin.userRole(userId), { role });
  return data;
}
