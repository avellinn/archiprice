import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchMySupportItems() {
  const { data } = await api.get(API_ROUTES.support.listMine);
  return data.supportItems || [];
}

export async function createSupportFeedback(payload) {
  const { data } = await api.post(API_ROUTES.support.create, payload);
  return data.supportItem;
}
