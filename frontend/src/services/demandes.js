import { API_ROUTES } from '../constants/api';
import api from './api';

export const DEMANDES_CHANGED_EVENT = 'archiprice:demandes-change';
const DEMANDES_CHANGED_CHANNEL = 'archiprice-demandes-change';

export function notifyDemandesChange(detail = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    at: new Date().toISOString(),
    ...detail,
  };

  window.dispatchEvent(new CustomEvent(DEMANDES_CHANGED_EVENT, { detail: payload }));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(DEMANDES_CHANGED_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  }
}

export function subscribeDemandesChange(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};

  const handleWindowEvent = (event) => callback(event.detail || {});
  window.addEventListener(DEMANDES_CHANGED_EVENT, handleWindowEvent);

  let channel;
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(DEMANDES_CHANGED_CHANNEL);
    channel.addEventListener('message', (event) => callback(event.data || {}));
  }

  return () => {
    window.removeEventListener(DEMANDES_CHANGED_EVENT, handleWindowEvent);
    channel?.close();
  };
}

export async function fetchMyDemandes() {
  const { data } = await api.get(API_ROUTES.demandes.listMine);
  return Array.isArray(data.demandes) ? data.demandes : [];
}

export async function createDemande(payload) {
  const { data } = await api.post(API_ROUTES.demandes.create, payload);
  notifyDemandesChange({ action: 'created', demande: data.demande });
  return data.demande;
}

export async function replyToDemande(demandeId, message) {
  const { data } = await api.post(API_ROUTES.demandes.messages(demandeId), { message });
  notifyDemandesChange({ action: 'message-created', demande: data.demande });
  return data.demande;
}

export async function markDemandeRead(demandeId) {
  if (!demandeId) return;
  await api.patch(API_ROUTES.demandes.read(demandeId));
  notifyDemandesChange({ action: 'read', demandeId });
}

export async function hideDemande(demandeId) {
  await api.delete(API_ROUTES.demandes.hide(demandeId));
  notifyDemandesChange({ action: 'hidden', demandeId });
}
