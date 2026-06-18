import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchMyDemandes() {
  const { data } = await api.get(API_ROUTES.demandes.listMine);
  return Array.isArray(data.demandes) ? data.demandes : [];
}

export async function createDemande(payload) {
  const { data } = await api.post(API_ROUTES.demandes.create, payload);
  return data.demande;
}

export async function replyToDemande(demandeId, message) {
  const { data } = await api.post(API_ROUTES.demandes.messages(demandeId), { message });
  return data.demande;
}
