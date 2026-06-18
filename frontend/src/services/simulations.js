import { API_ROUTES } from '../constants/api';
import api from './api';

export async function createSimulation(payload) {
  const { data } = await api.post(API_ROUTES.simulations.create, payload, { skipUnauthorizedHandler: true });
  return data.simulation;
}
