import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Product from '../models/Product.js';
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
    products: [],
    regionalCoefficients: stripLegacyStaticItems(config.regionalCoefficients),
    supplierClientNotifications: stripLegacyStaticItems(config.supplierClientNotifications),
    taxonomies: sanitizeTaxonomies(config.taxonomies),
    supplierSettings: sanitizeAccountSettings(config.supplierSettings),
    adminSettings: sanitizeAccountSettings(config.adminSettings),
  };
}

function formatCatalogueProduct(product) {
  const plain = product.toObject ? product.toObject() : product;
  const supplier = plain.supplier && typeof plain.supplier === 'object' ? plain.supplier : null;
  const supplierUser = plain.supplierUser && typeof plain.supplierUser === 'object' ? plain.supplierUser : null;
  const supplierName = supplier?.companyName || supplier?.name || supplierUser?.name || supplierUser?.email || 'Fournisseur';
  const image = (plain.images || [])[0]?.secure_url || '';

  return {
    id: String(plain._id),
    sourceSupplierProductId: String(plain._id),
    name: plain.name,
    description: plain.description || '',
    category: plain.category || '',
    room: plain.room || '',
    range: plain.range || '',
    availability: plain.availability || '',
    city: plain.city || supplier?.city || supplier?.region || '',
    neighborhood: plain.neighborhood || supplier?.neighborhood || '',
    unit: plain.unit || 'u',
    unitPrice: plain.unitPrice || 0,
    price: plain.unitPrice || 0,
    supplier: supplierName,
    supplierName,
    shop: supplierName,
    image,
    images: plain.images || [],
    publicationStatus: plain.publicationStatus || 'Brouillon',
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
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

router.get('/catalogue/products', async (_req, res) => {
  const products = await Product.find({ publicationStatus: 'Validé' })
    .populate('supplier', 'name companyName email city region neighborhood status')
    .populate('supplierUser', 'name email status')
    .sort({ updatedAt: -1 });
  const visibleProducts = products.filter((product) => {
    const supplier = product.supplier && typeof product.supplier === 'object' ? product.supplier : null;
    const supplierUser = product.supplierUser && typeof product.supplierUser === 'object' ? product.supplierUser : null;
    const status = supplier?.status || supplierUser?.status || 'Actif';
    return !['Bloqué', 'Supprimé'].includes(status);
  });

  return res.json({ products: visibleProducts.map(formatCatalogueProduct) });
});

export default router;
