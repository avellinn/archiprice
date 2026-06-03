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

async function readCatalogueConfig() {
  try {
    const rawConfig = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(rawConfig);
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
    ...config,
    __updatedAt: Date.now(),
  };

  await writeCatalogueConfig(nextConfig);
  publishCrudEvent('catalogue-config', 'updated', { updatedAt: nextConfig.__updatedAt });
  return res.json({ config: nextConfig });
});

export default router;
