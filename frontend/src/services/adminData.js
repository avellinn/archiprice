import { useCallback, useEffect, useState } from 'react';

const ADMIN_DATA_KEY = 'archiprice_admin_data';

export const DEFAULT_ADMIN_DATA = {
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
  products: [
    {
      id: 'prod-1',
      visual: 'sofa',
      name: 'Canapé 3 places Oslo',
      description: 'Canapé moderne 3 places, tissu gris clair, pieds en bois.',
      price: '890,00 €',
      vat: '20%',
      category: 'Mobilier',
      room: 'Salon',
      range: 'Confort',
      availability: 'Disponible',
      supplier: 'Meubles Plus',
      city: 'Cotonou',
    },
    {
      id: 'prod-2',
      visual: 'table',
      name: 'Table basse ronde Léon',
      description: 'Table basse ronde finition bois clair.',
      price: '210,00 €',
      vat: '20%',
      category: 'Mobilier',
      room: 'Salon',
      range: 'Confort',
      availability: 'Disponible',
      supplier: 'Design House',
      city: 'Cotonou',
    },
    {
      id: 'prod-3',
      visual: 'lamp',
      name: 'Suspension en verre Mia',
      description: 'Suspension décorative en verre fumé.',
      price: '120,00 €',
      vat: '20%',
      category: 'Luminaire',
      room: 'Salon',
      range: 'Premium',
      availability: 'Sur commande',
      supplier: 'Lumière & Co',
      city: 'Abidjan',
    },
    {
      id: 'prod-4',
      visual: 'tile',
      name: 'Carrelage grès cérame 60x60',
      description: 'Carrelage gris résistant pour sol intérieur.',
      price: '25,00 €',
      vat: '10%',
      category: 'Revêtement',
      room: 'Douche',
      range: 'Essentiel',
      availability: 'Disponible',
      supplier: 'Carrelages Bénin',
      city: 'Cotonou',
    },
    {
      id: 'prod-5',
      visual: 'paint',
      name: 'Peinture intérieure mat blanc',
      description: 'Peinture murale intérieure finition mate.',
      price: '32,50 €',
      vat: '10%',
      category: 'Revêtement',
      room: 'Appartement',
      range: 'Essentiel',
      availability: 'Rupture',
      supplier: 'BatiPro',
      city: 'Parakou',
    },
    {
      id: 'prod-6',
      visual: 'chair',
      name: 'Chaise de bureau Ergo',
      description: 'Chaise ergonomique pour espace de travail.',
      price: '150,00 €',
      vat: '20%',
      category: 'Mobilier',
      room: 'Bureau',
      range: 'Confort',
      availability: 'Disponible',
      supplier: 'BureauPro',
      city: 'Cotonou',
    },
    {
      id: 'prod-7',
      visual: 'shelf',
      name: 'Bibliothèque en bois Clara',
      description: 'Bibliothèque en bois avec plusieurs niches.',
      price: '330,00 €',
      vat: '20%',
      category: 'Mobilier',
      room: 'Bureau',
      range: 'Premium',
      availability: 'Disponible',
      supplier: 'Meubles Plus',
      city: 'Cotonou',
    },
    {
      id: 'prod-8',
      visual: 'wall-light',
      name: 'Applique murale LED',
      description: 'Applique LED économique pour éclairage mural.',
      price: '75,00 €',
      vat: '20%',
      category: 'Luminaire',
      room: 'Chambre',
      range: 'Essentiel',
      availability: 'Disponible',
      supplier: 'Lumière & Co',
      city: 'Abidjan',
    },
  ],
  suppliers: [
    { id: 'sup-1', name: 'Meubles Plus', contact: 'contact@meublesplus.bj', region: 'Cotonou', status: 'Actif', products: 56 },
    { id: 'sup-2', name: 'Design House', contact: 'info@designhouse.bj', region: 'Cotonou', status: 'Actif', products: 28 },
    { id: 'sup-3', name: 'Lumière & Co', contact: 'contact@lumiereco.bj', region: 'Abidjan', status: 'Actif', products: 34 },
    { id: 'sup-4', name: 'Carrelages Bénin', contact: 'contact@carrelagesbj.bj', region: 'Cotonou', status: 'Actif', products: 22 },
    { id: 'sup-5', name: 'BatiPro', contact: 'contact@batipro.bj', region: 'Parakou', status: 'Inactif', products: 10 },
    { id: 'sup-6', name: 'BureauPro', contact: 'info@bureaupro.bj', region: 'Cotonou', status: 'Actif', products: 15 },
  ],
  taxonomies: {
    categories: [
      { id: 'cat-1', name: 'Mobilier', count: 56 },
      { id: 'cat-2', name: 'Luminaire', count: 34 },
      { id: 'cat-3', name: 'Revêtement', count: 22 },
      { id: 'cat-4', name: 'Sanitaire', count: 9 },
      { id: 'cat-5', name: 'Décoration', count: 7 },
    ],
    rooms: [
      { id: 'room-1', name: 'Salon', count: 41 },
      { id: 'room-2', name: 'Chambre', count: 24 },
      { id: 'room-3', name: 'Bureau', count: 18 },
      { id: 'room-4', name: 'Douche', count: 12 },
    ],
    ranges: [
      { id: 'range-1', name: 'Essentiel', count: 39 },
      { id: 'range-2', name: 'Confort', count: 52 },
      { id: 'range-3', name: 'Premium', count: 37 },
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
    currency: 'EUR',
  },
  regionalCoefficients: [
    { id: 'city-1', city: 'Cotonou', coefficient: '1,00' },
    { id: 'city-2', city: 'Abidjan', coefficient: '1,05' },
    { id: 'city-3', city: 'Dakar', coefficient: '1,08' },
    { id: 'city-4', city: 'Paris', coefficient: '1,25' },
    { id: 'city-5', city: 'Lomé', coefficient: '1,02' },
  ],
};

function mergeAdminData(savedData) {
  return {
    ...DEFAULT_ADMIN_DATA,
    ...(savedData || {}),
    taxonomies: {
      ...DEFAULT_ADMIN_DATA.taxonomies,
      ...(savedData?.taxonomies || {}),
    },
    settings: {
      ...DEFAULT_ADMIN_DATA.settings,
      ...(savedData?.settings || {}),
    },
  };
}

export function getAdminData() {
  try {
    const savedData = JSON.parse(localStorage.getItem(ADMIN_DATA_KEY) || 'null');
    return mergeAdminData(savedData);
  } catch {
    return DEFAULT_ADMIN_DATA;
  }
}

export function saveAdminData(data) {
  localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('archiprice-admin-data'));
}

export function createAdminId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function useAdminData() {
  const [data, setData] = useState(getAdminData);

  useEffect(() => {
    function handleDataChange() {
      setData(getAdminData());
    }

    window.addEventListener('storage', handleDataChange);
    window.addEventListener('archiprice-admin-data', handleDataChange);

    return () => {
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('archiprice-admin-data', handleDataChange);
    };
  }, []);

  const updateData = useCallback((updater) => {
    setData((currentData) => {
      const nextData = typeof updater === 'function' ? updater(currentData) : updater;
      saveAdminData(nextData);
      return nextData;
    });
  }, []);

  return [data, updateData];
}
