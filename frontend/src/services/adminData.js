import { useCallback, useEffect, useRef, useState } from 'react';
import api from './api';

const ADMIN_DATA_KEY = 'archiprice_admin_data';
const ADMIN_DATA_EVENT = 'archiprice-admin-data';
const ADMIN_DATA_CHANNEL = 'archiprice-admin-data-channel';
const ADMIN_DATA_POLL_INTERVAL = 500;
const ADMIN_DATA_REMOTE_POLL_INTERVAL = 2500;
const ADMIN_DATA_REMOTE_ROUTE = '/api/catalogue-config';

export const DEFAULT_ADMIN_DATA = {
  __version: 1,
  __updatedAt: 0,
  users: [
    {
      id: 'user-jean-dupont',
      name: 'Jean Dupont',
      email: 'jean.dupont@mail.com',
      type: 'Architecte',
      simulations: 24,
      inscription: '12/03/2024',
      status: 'Actif',
      subscription: 'Essai',
    },
    {
      id: 'user-sophia-martin',
      name: 'Sophia Martin',
      email: 'sophia.martin@mail.com',
      type: 'Décorateur',
      simulations: 18,
      inscription: '20/03/2024',
      status: 'Actif',
      subscription: 'Basique',
    },
    {
      id: 'user-agence-crea',
      name: 'Agence Créa',
      email: 'contact@agencecrea.bj',
      type: 'Agence',
      simulations: 56,
      inscription: '05/02/2024',
      status: 'Actif',
      subscription: 'Premium',
    },
    {
      id: 'user-marc-koffi',
      name: 'Marc Koffi',
      email: 'marc.koffi@mail.com',
      type: 'Architecte',
      simulations: 12,
      inscription: '01/04/2024',
      status: 'Inactif',
      subscription: 'Essai',
    },
    {
      id: 'user-admin-principal',
      name: 'Admin Principal',
      email: 'admin@archiprice.com',
      type: 'Admin',
      simulations: '-',
      inscription: '01/01/2024',
      status: 'Actif',
      subscription: '-',
    },
  ],
  products: [],
  suppliers: [
    { id: 'sup-1', name: 'Meubles Plus', contact: 'contact@meublesplus.bj', region: 'Cotonou', status: 'Actif', products: 56 },
    { id: 'sup-2', name: 'Design House', contact: 'info@designhouse.bj', region: 'Cotonou', status: 'Actif', products: 28 },
    { id: 'sup-3', name: 'Lumière & Co', contact: 'contact@lumiereco.bj', region: 'Abidjan', status: 'Actif', products: 34 },
    { id: 'sup-4', name: 'Carrelages Bénin', contact: 'contact@carrelagesbj.bj', region: 'Cotonou', status: 'Actif', products: 22 },
    { id: 'sup-5', name: 'BatiPro', contact: 'contact@batipro.bj', region: 'Parakou', status: 'Inactif', products: 10 },
    { id: 'sup-6', name: 'BureauPro', contact: 'info@bureaupro.bj', region: 'Cotonou', status: 'Actif', products: 15 },
  ],
  supplierClientNotifications: [],
  taxonomies: {
    categories: [
      { id: 'cat-1', name: 'Mobilier', count: 56 },
      { id: 'cat-2', name: 'Luminaire', count: 34 },
      { id: 'cat-3', name: 'Revêtement', count: 22 },
      { id: 'cat-4', name: 'Sanitaire', count: 9 },
      { id: 'cat-5', name: 'Décoration', count: 7 },
      { id: 'cat-6', name: 'Éclairage', count: 0 },
      { id: 'cat-7', name: 'Textiles', count: 0 },
      { id: 'cat-8', name: 'Objets décoratifs', count: 0 },
      { id: 'cat-9', name: 'Miroirs', count: 0 },
      { id: 'cat-10', name: 'Rangements', count: 0 },
      { id: 'cat-11', name: 'Plantes & Pots', count: 0 },
    ],
    rooms: [
      { id: 'room-1', name: 'Salon', count: 41 },
      { id: 'room-2', name: 'Chambre', count: 24 },
      { id: 'room-3', name: 'Bureau', count: 18 },
      { id: 'room-4', name: 'Douche', count: 12 },
      { id: 'room-5', name: 'Cuisine', count: 0 },
      { id: 'room-6', name: 'Appartement', count: 0 },
      { id: 'room-7', name: 'Espace externe', count: 0 },
    ],
    ranges: [
      { id: 'range-1', name: 'Essentiel', count: 39 },
      { id: 'range-2', name: 'Confort', count: 52 },
      { id: 'range-3', name: 'Premium', count: 37 },
    ],
    availability: [
      { id: 'availability-1', name: 'Disponible', count: 0 },
      { id: 'availability-2', name: 'Sur commande', count: 0 },
      { id: 'availability-3', name: 'Rupture', count: 0 },
      { id: 'availability-4', name: 'Non disponible', count: 0 },
    ],
  },
  simulations: [
    { id: 'sim-1', user: 'Jean Dupont', email: 'jean.dupont@mail.com', date: '12/05/2024 14:30', total: '12 450,00 €', products: 28, status: 'Succès', city: 'Cotonou', coefficient: '1,00', avatar: 'JD' },
    { id: 'sim-2', user: 'Sophia Martin', email: 'sophia.martin@mail.com', date: '11/05/2024 10:12', total: '8 920,00 €', products: 16, status: 'Succès', city: 'Abidjan', coefficient: '1,08', avatar: 'SM' },
    { id: 'sim-3', user: 'Agence Créa', email: 'contact@agencenova.bj', date: '10/05/2024 16:45', total: '21 350,00 €', products: 42, status: 'Succès', city: 'Cotonou', coefficient: '1,00', avatar: 'AC' },
    { id: 'sim-4', user: 'Jean Dupont', email: 'jean.dupont@mail.com', date: '09/05/2024 09:15', total: '-', products: '-', status: 'Échec', city: 'Cotonou', coefficient: '1,00', avatar: 'JD' },
    { id: 'sim-5', user: 'Marc Koffi', email: 'marc.koffi@mail.com', date: '08/05/2024 11:00', total: '6 230,00 €', products: 12, status: 'Succès', city: 'Parakou', coefficient: '0,96', avatar: 'MK' },
  ],
  supportItems: [
    { id: 'ticket-export', tab: 'tickets', subject: "Impossible d'exporter une simulation", user: 'Jean Dupont', email: 'jean.dupont@mail.com', status: 'Ouvert', type: 'Bug', date: '12/05/2024', description: "Lorsque j'essaie d'exporter la simulation, le fichier ne se télécharge pas.", reply: '' },
    { id: 'ticket-cartilage', tab: 'tickets', subject: 'Prix incorrect sur carrelage', user: 'Sophia Martin', email: 'sophia.martin@mail.com', status: 'En cours', type: 'Prix', date: '11/05/2024', description: 'Le prix affiché dans la simulation ne correspond pas au prix fournisseur.', reply: '' },
    { id: 'feedback-navigation', tab: 'feedback', subject: 'Navigation plus fluide', user: 'Jean Dupont', email: 'jean.dupont@mail.com', status: 'Ouvert', type: 'Suggestion', date: '08/05/2024', description: 'Ajouter un raccourci vers le catalogue depuis la page workspace rendrait le parcours plus rapide.', reply: '' },
    { id: 'price-report-oslo', tab: 'priceReports', subject: 'Canapé Oslo trop élevé', user: 'Agence Créa', email: 'contact@agencecrea.bj', status: 'En cours', type: 'Signalement prix', date: '06/05/2024', description: 'Le prix du Canapé 3 places Oslo semble supérieur à celui observé chez le fournisseur.', reply: '' },
  ],
  settings: {
    margin: '10',
    vat: '20',
    rounding: 'Au centime près',
    currency: 'FCFA',
  },
  regionalCoefficients: [
    { id: 'city-1', city: 'Cotonou', coefficient: '1,00' },
    { id: 'city-2', city: 'Abomey - calavi', coefficient: '1,00' },
    { id: 'city-3', city: 'Porto-novo', coefficient: '1,00' },
  ],
};

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
  const savedByName = new Map(savedItems.map((item) => [item.name, item]));
  const mergedItems = defaultItems.map((item) => ({
    ...item,
    ...(savedByName.get(item.name) || {}),
  }));
  const defaultNames = new Set(defaultItems.map((item) => item.name));
  const customItems = savedItems.filter((item) => !defaultNames.has(item.name));

  return [...mergedItems, ...customItems];
}

function mergeTaxonomies(savedTaxonomies = {}) {
  return Object.keys(DEFAULT_ADMIN_DATA.taxonomies).reduce((taxonomies, key) => ({
    ...taxonomies,
    [key]: mergeTaxonomyList(
      DEFAULT_ADMIN_DATA.taxonomies[key],
      savedTaxonomies[key] || [],
    ),
  }), {});
}

function isLegacyLocalUploadUrl(value) {
  return typeof value === 'string'
    && (
      value.includes('/uploads/catalogue/')
      || value.includes('localhost:5000/uploads/')
    );
}

function normalizeProductImage(image) {
  if (!image || isLegacyLocalUploadUrl(image)) return null;
  if (typeof image === 'string') return image;
  if (typeof image !== 'object') return null;

  const secureUrl = image.secure_url || image.url || '';
  if (!secureUrl || isLegacyLocalUploadUrl(secureUrl)) return null;

  return {
    secure_url: secureUrl,
    public_id: image.public_id || '',
    metadata: image.metadata || {},
  };
}

function normalizeProducts(products = []) {
  if (!Array.isArray(products)) return [];

  return products
    .filter((product) => product && typeof product === 'object')
    .map((product) => {
      const images = (Array.isArray(product.images) ? product.images : [])
        .map(normalizeProductImage)
        .filter(Boolean)
        .slice(0, 12);
      const image = normalizeProductImage(product.image);
      const primaryImage = images[0]?.secure_url || (typeof image === 'string' ? image : image?.secure_url) || '';

      return {
        ...product,
        image: primaryImage,
        images,
      };
    });
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
  return {
    ...DEFAULT_ADMIN_DATA,
    ...(savedData || {}),
    __version: savedData?.__version || DEFAULT_ADMIN_DATA.__version,
    __updatedAt: savedData?.__updatedAt || DEFAULT_ADMIN_DATA.__updatedAt,
    taxonomies: mergeTaxonomies(savedData?.taxonomies),
    products: normalizeProducts(savedData?.products || DEFAULT_ADMIN_DATA.products),
    settings: {
      ...DEFAULT_ADMIN_DATA.settings,
      ...(savedData?.settings || {}),
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

    syncRemoteAdminData();
    const intervalId = window.setInterval(syncRemoteAdminData, ADMIN_DATA_REMOTE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
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
