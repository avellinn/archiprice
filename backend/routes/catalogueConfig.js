import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishCrudEvent } from '../services/realtimeService.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'catalogueConfig.json');
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

function isLegacyStaticItem(item) {
  const id = String(item?.id || item?._id || '');
  return LEGACY_STATIC_ID_PATTERNS.some((pattern) => pattern.test(id));
}

function stripLegacyStaticItems(items = []) {
  return Array.isArray(items) ? items.filter((item) => item && !isLegacyStaticItem(item)) : [];
}

function sanitizeProfile(profile = {}) {
  if (!profile || typeof profile !== 'object') return {};

  return {
    ...profile,
    name: profile.name === 'Admin Principal' ? '' : profile.name,
    email: ['admin@archiprice.com', 'hospiceavell@gmail.com'].includes(profile.email) ? '' : profile.email,
    phone: profile.phone === 'Aucun numéro de téléphone' ? '' : profile.phone,
  };
}

function sanitizeSettings(settings = {}) {
  if (!settings || typeof settings !== 'object') return {};

  return {
    ...settings,
    city: settings.city === 'Cotonou' ? '' : settings.city,
  };
}

function sanitizeAccountSettings(accountSettings = {}) {
  if (!accountSettings || typeof accountSettings !== 'object') return {};

  return {
    ...accountSettings,
    profile: sanitizeProfile(accountSettings.profile),
    shopProfile: sanitizeProfile(accountSettings.shopProfile),
    settings: sanitizeSettings(accountSettings.settings),
  };
}

function sanitizeTaxonomies(taxonomies = {}) {
  return Object.entries(taxonomies || {}).reduce((nextTaxonomies, [key, items]) => ({
    ...nextTaxonomies,
    [key]: stripLegacyStaticItems(items),
  }), {});
}

function sanitizeCatalogueConfig(config) {
  if (!config || typeof config !== 'object') return config;

  return {
    ...config,
    users: stripLegacyStaticItems(config.users),
    suppliers: stripLegacyStaticItems(config.suppliers),
    simulations: stripLegacyStaticItems(config.simulations),
    supportItems: stripLegacyStaticItems(config.supportItems),
    regionalCoefficients: stripLegacyStaticItems(config.regionalCoefficients),
    supplierClientNotifications: stripLegacyStaticItems(config.supplierClientNotifications),
    supplierPublicationNotices: stripLegacyStaticItems(config.supplierPublicationNotices),
    taxonomies: sanitizeTaxonomies(config.taxonomies),
    supplierSettings: sanitizeAccountSettings(config.supplierSettings),
    adminSettings: sanitizeAccountSettings(config.adminSettings),
  };
}

async function readCatalogueConfig() {
  try {
    const rawConfig = await fs.readFile(DATA_FILE, 'utf8');
    return sanitizeCatalogueConfig(JSON.parse(rawConfig));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeCatalogueConfig(config) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(config, null, 2));
}

router.get('/catalogue-config', async (_req, res) => {
  const config = await readCatalogueConfig();
  res.json({ config });
});

router.put('/catalogue-config', async (req, res) => {
  const config = req.body?.config;

  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Configuration catalogue invalide' });
  }

  const nextConfig = {
    ...sanitizeCatalogueConfig(config),
    __updatedAt: Date.now(),
  };

  await writeCatalogueConfig(nextConfig);
  publishCrudEvent('catalogue-config', 'updated', { updatedAt: nextConfig.__updatedAt });
  return res.json({ config: nextConfig });
});

export default router;
