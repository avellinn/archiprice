import { API_ROUTES } from '../constants/api';
import api from './api';

export const SUPPORT_CHANGED_EVENT = 'archiprice:support-change';
const SUPPORT_CHANGED_CHANNEL = 'archiprice-support-change';

export function notifySupportChange(detail = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    at: new Date().toISOString(),
    ...detail,
  };

  window.dispatchEvent(new CustomEvent(SUPPORT_CHANGED_EVENT, { detail: payload }));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(SUPPORT_CHANGED_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  }
}

export function subscribeSupportChange(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};

  const handleWindowEvent = (event) => callback(event.detail || {});
  window.addEventListener(SUPPORT_CHANGED_EVENT, handleWindowEvent);

  let channel;
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(SUPPORT_CHANGED_CHANNEL);
    channel.addEventListener('message', (event) => callback(event.data || {}));
  }

  return () => {
    window.removeEventListener(SUPPORT_CHANGED_EVENT, handleWindowEvent);
    channel?.close();
  };
}

export async function fetchMySupportItems() {
  const { data } = await api.get(API_ROUTES.support.listMine);
  return data.supportItems || [];
}

export async function createSupportFeedback(payload) {
  const { data } = await api.post(API_ROUTES.support.create, payload);
  notifySupportChange({ action: 'created', supportItem: data.supportItem });
  return data.supportItem;
}

export async function replyToSupportItem(itemId, message) {
  const { data } = await api.post(API_ROUTES.support.messages(itemId), { message });
  notifySupportChange({ action: 'message-created', supportItem: data.supportItem });
  return data.supportItem;
}

export async function markSupportItemRead(itemId) {
  if (!itemId) return;
  await api.patch(API_ROUTES.support.read(itemId));
  notifySupportChange({ action: 'read', supportItemId: itemId });
}
