import { useCallback, useEffect, useRef, useState } from 'react';
import api from './api';
import { REALTIME_EVENT } from './realtime';

const ADMIN_DATA_KEY = 'archiprice_admin_data';
const ADMIN_DATA_EVENT = 'archiprice-admin-data';
const ADMIN_DATA_CHANNEL = 'archiprice-admin-data-channel';
const ADMIN_DATA_POLL_INTERVAL = 500;
const ADMIN_DATA_REMOTE_POLL_INTERVAL = 2500;
const ADMIN_DATA_REMOTE_ROUTE = '/api/catalogue-config';
const ADMIN_DATA_STATIC_PURGE_VERSION = 2;

export const DEFAULT_ADMIN_DATA = {
  __version: 1,
  __updatedAt: 0,
  __staticPurgeVersion: ADMIN_DATA_STATIC_PURGE_VERSION,
  users: [],
  products: [],
  suppliers: [],
  supplierClientNotifications: [],
  taxonomies: {
    categories: [],
    rooms: [],
    ranges: [],
    availability: [],
    cities: [],
    neighborhoods: [],
  },
  simulations: [],
  supportItems: [],
  settings: {
    margin: '10',
    vat: '20',
    rounding: 'Au centime près',
    currency: 'FCFA',
  },
  regionalCoefficients: [],
};

const LEGACY_STATIC_ID_PATTERNS = [
  /^user-(jean-dupont|sophia-martin|agence-crea|marc-koffi|admin-principal)$/,
  /^sup-\d+$/,
  /^sim-\d+$/,
  /^(ticket|feedback|price-report)-/,
  /^cat-\d+$/,
  /^room-\d+$/,
  /^range-\d+$/,
  /^availability-\d+$/,
  /^city-taxonomy-\d+$/,
  /^neighborhood-\d+$/,
  /^city-\d+$/,
  /^supplier-client-Ma boutique-/,
];

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getAdminDataSnapshot() {
  if (!canUseBrowserStorage()) return '';

  try {
    return window.localStorage.getItem(ADMIN_DATA_KEY) || '';
  } catch {
    return '';
  }
}

function parseAdminDataSnapshot(snapshot) {
  if (!snapshot) return null;

  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

function mergeTaxonomyList(defaultItems = [], savedItems = []) {
  const seededIds = new Set(defaultItems.map((item) => item.id).filter(Boolean));

  return savedItems.filter((item) => item && !seededIds.has(item.id));
}

function isLegacyStaticItem(item) {
  const id = String(item?.id || item?._id || '');

  return LEGACY_STATIC_ID_PATTERNS.some((pattern) => pattern.test(id));
}

function stripLegacyStaticItems(items = []) {
  return Array.isArray(items) ? items.filter((item) => item && !isLegacyStaticItem(item)) : [];
}

function stripLegacyProfile(profile = {}) {
  if (!profile || typeof profile !== 'object') return {};

  return {
    ...profile,
    name: profile.name === 'Admin Principal' ? '' : profile.name,
    email: profile.email === 'admin@archiprice.com' || profile.email === 'hospiceavell@gmail.com' ? '' : profile.email,
    phone: profile.phone === 'Aucun numéro de téléphone' ? '' : profile.phone,
  };
}

function stripLegacySettings(settings = {}) {
  if (!settings || typeof settings !== 'object') return {};

  return {
    ...settings,
    city: settings.city === 'Cotonou' ? '' : settings.city,
  };
}

function stripLegacyAccountSettings(accountSettings = {}) {
  if (!accountSettings || typeof accountSettings !== 'object') return {};

  return {
    ...accountSettings,
    profile: stripLegacyProfile(accountSettings.profile),
    shopProfile: stripLegacyProfile(accountSettings.shopProfile),
    settings: stripLegacySettings(accountSettings.settings),
  };
}

function stripLegacyTaxonomies(taxonomies = {}) {
  return Object.keys(DEFAULT_ADMIN_DATA.taxonomies).reduce((nextTaxonomies, key) => ({
    ...nextTaxonomies,
    [key]: stripLegacyStaticItems(taxonomies[key] || []),
  }), {});
}

function mergeTaxonomies(savedTaxonomies = {}) {
  const dynamicTaxonomies = stripLegacyTaxonomies(savedTaxonomies);

  return Object.keys(DEFAULT_ADMIN_DATA.taxonomies).reduce((taxonomies, key) => ({
    ...taxonomies,
    [key]: mergeTaxonomyList(DEFAULT_ADMIN_DATA.taxonomies[key], dynamicTaxonomies[key] || []),
  }), {});
}

function isLegacyLocalUploadUrl(value) {
  return typeof value === 'string'
    && (
      value.includes('/uploads/catalogue/')
      || value.includes('localhost:5000/uploads/')
    );
}

function hasLegacyProductImages(data) {
  return (Array.isArray(data?.products) ? data.products : []).some((product) => (
    isLegacyLocalUploadUrl(product?.image)
    || (Array.isArray(product?.images) && product.images.some((image) => (
      isLegacyLocalUploadUrl(image) || isLegacyLocalUploadUrl(image?.secure_url || image?.url)
    )))
  ));
}

function mergeAdminData(savedData) {
  const dynamicData = savedData?.__staticPurgeVersion === ADMIN_DATA_STATIC_PURGE_VERSION
    ? savedData
    : {};

  return {
    ...DEFAULT_ADMIN_DATA,
    ...dynamicData,
    __version: dynamicData?.__version || DEFAULT_ADMIN_DATA.__version,
    __updatedAt: dynamicData?.__updatedAt || DEFAULT_ADMIN_DATA.__updatedAt,
    __staticPurgeVersion: ADMIN_DATA_STATIC_PURGE_VERSION,
    users: stripLegacyStaticItems(dynamicData?.users || DEFAULT_ADMIN_DATA.users),
    suppliers: stripLegacyStaticItems(dynamicData?.suppliers || DEFAULT_ADMIN_DATA.suppliers),
    simulations: stripLegacyStaticItems(dynamicData?.simulations || DEFAULT_ADMIN_DATA.simulations),
    supportItems: [],
    regionalCoefficients: stripLegacyStaticItems(dynamicData?.regionalCoefficients || DEFAULT_ADMIN_DATA.regionalCoefficients),
    supplierClientNotifications: stripLegacyStaticItems(dynamicData?.supplierClientNotifications || DEFAULT_ADMIN_DATA.supplierClientNotifications),
    supplierSettings: stripLegacyAccountSettings(dynamicData?.supplierSettings),
    adminSettings: stripLegacyAccountSettings(dynamicData?.adminSettings),
    taxonomies: mergeTaxonomies(dynamicData?.taxonomies),
    products: [],
    settings: {
      ...DEFAULT_ADMIN_DATA.settings,
      ...(dynamicData?.settings || {}),
    },
  };
}

function getDataTimestamp(data) {
  const timestamp = Number(data?.__updatedAt || 0);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDataVersion(data) {
  const version = Number(data?.__version || 0);

  return Number.isFinite(version) ? version : 0;
}

function isIncomingDataNewer(incomingData, currentData) {
  const incomingTimestamp = getDataTimestamp(incomingData);
  const currentTimestamp = getDataTimestamp(currentData);

  if (incomingTimestamp !== currentTimestamp) {
    return incomingTimestamp > currentTimestamp;
  }

  return getDataVersion(incomingData) > getDataVersion(currentData);
}

export function getAdminData() {
  return mergeAdminData(parseAdminDataSnapshot(getAdminDataSnapshot()));
}

function persistSyncedAdminData(data) {
  const nextData = mergeAdminData(data);

  if (canUseBrowserStorage()) {
    try {
      window.localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(nextData));
    } catch {
      window.localStorage.removeItem(ADMIN_DATA_KEY);
    }
  }

  notifyAdminDataChange(nextData);
  return nextData;
}

export async function fetchRemoteAdminData() {
  const { data } = await api.get(ADMIN_DATA_REMOTE_ROUTE);
  return data.config ? mergeAdminData(data.config) : null;
}

export async function saveRemoteAdminData(data) {
  const response = await api.put(ADMIN_DATA_REMOTE_ROUTE, { config: mergeAdminData(data) });
  return mergeAdminData(response.data.config);
}

function notifyAdminDataChange(data) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(ADMIN_DATA_EVENT, { detail: data }));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(ADMIN_DATA_CHANNEL);
    channel.postMessage({ type: ADMIN_DATA_EVENT, data });
    channel.close();
  }
}

export async function syncAdminDataFromRemote() {
  const remoteData = await fetchRemoteAdminData();
  if (!remoteData) return getAdminData();

  return persistSyncedAdminData(remoteData);
}

export function saveAdminData(data) {
  const nextData = {
    ...mergeAdminData(data),
    __version: Number(data?.__version || 0) + 1,
    __updatedAt: Date.now(),
  };

  if (canUseBrowserStorage()) {
    try {
      window.localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(nextData));
    } catch {
      window.localStorage.removeItem(ADMIN_DATA_KEY);
    }
  }
  notifyAdminDataChange(nextData);

  return nextData;
}

export function createAdminId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function useAdminData() {
  const [data, setData] = useState(getAdminData);
  const snapshotRef = useRef(getAdminDataSnapshot());
  const isSavingRemoteRef = useRef(false);

  const syncAdminData = useCallback((incomingData) => {
    const nextSnapshot = getAdminDataSnapshot();

    if (nextSnapshot !== snapshotRef.current) {
      snapshotRef.current = nextSnapshot;
      setData(mergeAdminData(parseAdminDataSnapshot(nextSnapshot)));
      return;
    }

    if (incomingData && typeof incomingData === 'object') {
      const normalizedIncomingData = mergeAdminData(incomingData);
      const currentData = mergeAdminData(parseAdminDataSnapshot(snapshotRef.current));
      const incomingSnapshot = JSON.stringify(normalizedIncomingData);

      if (incomingSnapshot !== snapshotRef.current && isIncomingDataNewer(normalizedIncomingData, currentData)) {
        snapshotRef.current = incomingSnapshot;
        setData(normalizedIncomingData);
      }
    }
  }, []);

  const applyRemoteAdminData = useCallback((remoteData) => {
    if (!remoteData) return;

    const normalizedRemoteData = mergeAdminData(remoteData);
    const currentData = getAdminData();
    if (!isIncomingDataNewer(normalizedRemoteData, currentData) && !hasLegacyProductImages(currentData)) return;

    const remoteSnapshot = JSON.stringify(normalizedRemoteData);
    if (remoteSnapshot === snapshotRef.current) return;

    const syncedData = persistSyncedAdminData(normalizedRemoteData);
    snapshotRef.current = getAdminDataSnapshot();
    setData(syncedData);
  }, []);

  useEffect(() => {
    function handleAdminDataEvent(event) {
      syncAdminData(event?.detail || event?.data?.data);
    }

    let channel;
    const intervalId = window.setInterval(syncAdminData, ADMIN_DATA_POLL_INTERVAL);

    window.addEventListener('storage', handleAdminDataEvent);
    window.addEventListener(ADMIN_DATA_EVENT, handleAdminDataEvent);
    window.addEventListener('focus', handleAdminDataEvent);
    window.addEventListener('pageshow', handleAdminDataEvent);
    document.addEventListener('visibilitychange', handleAdminDataEvent);

    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(ADMIN_DATA_CHANNEL);
      channel.addEventListener('message', handleAdminDataEvent);
    }

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', handleAdminDataEvent);
      window.removeEventListener(ADMIN_DATA_EVENT, handleAdminDataEvent);
      window.removeEventListener('focus', handleAdminDataEvent);
      window.removeEventListener('pageshow', handleAdminDataEvent);
      document.removeEventListener('visibilitychange', handleAdminDataEvent);
      channel?.removeEventListener('message', handleAdminDataEvent);
      channel?.close();
    };
  }, [syncAdminData]);

  useEffect(() => {
    let cancelled = false;

    async function syncRemoteAdminData() {
      if (isSavingRemoteRef.current) return;

      try {
        const remoteData = await fetchRemoteAdminData();
        if (!cancelled) applyRemoteAdminData(remoteData);
      } catch {
        // API indisponible: le fallback local continue de fonctionner.
      }
    }

    function handleRealtimeSync(event) {
      const payload = event?.detail;
      if (!payload || payload.type === 'connected') return;

      const entity = String(payload.entity || '');
      if (['catalogue-config', 'suppliers', 'users', 'simulations'].includes(entity)) {
        syncRemoteAdminData();
      }
    }

    syncRemoteAdminData();
    window.addEventListener(REALTIME_EVENT, handleRealtimeSync);
    const intervalId = window.setInterval(syncRemoteAdminData, ADMIN_DATA_REMOTE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(REALTIME_EVENT, handleRealtimeSync);
    };
  }, [applyRemoteAdminData]);

  const updateData = useCallback((updater) => {
    setData((currentData) => {
      const latestData = mergeAdminData(currentData || getAdminData());
      const nextData = typeof updater === 'function' ? updater(latestData) : updater;
      const savedData = saveAdminData(nextData);
      snapshotRef.current = getAdminDataSnapshot();

      isSavingRemoteRef.current = true;
      saveRemoteAdminData(savedData)
        .then((remoteData) => {
          const syncedData = persistSyncedAdminData(remoteData);
          snapshotRef.current = getAdminDataSnapshot();
          setData(syncedData);
        })
        .catch(() => {
          // Les données locales restent disponibles si l'API est hors ligne.
        })
        .finally(() => {
          isSavingRemoteRef.current = false;
        });

      return savedData;
    });
  }, []);

  return [data, updateData];
}
