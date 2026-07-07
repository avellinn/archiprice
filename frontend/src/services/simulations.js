import { API_ROUTES } from '../constants/api';
import api from './api';

export async function createSimulation(payload) {
  const { data } = await api.post(API_ROUTES.simulations.create, payload, { skipUnauthorizedHandler: true });
  return data.simulation;
}

export async function fetchMySimulationCount() {
  const { data } = await api.get(API_ROUTES.simulations.myCount);
  return Number(data.count || 0);
}

export async function fetchMySimulations() {
  const { data } = await api.get(API_ROUTES.simulations.create);
  return Array.isArray(data.simulations) ? data.simulations : [];
}

export async function deleteSimulation(id) {
  const { data } = await api.delete(`/api/simulations/${encodeURIComponent(id)}`);
  return data;
}
