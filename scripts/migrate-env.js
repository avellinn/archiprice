#!/usr/bin/env node
/**
 * Migre backend/.env → archi-price/.env (racine).
 * Usage : node scripts/migrate-env.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const rootEnvPath = path.join(root, '.env');
const backendEnvPath = path.join(root, 'backend', '.env');
const examplePath = path.join(root, '.env.example');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const vars = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

function serializeEnv(vars) {
  const lines = [
    '# Généré / migré — ne pas committer',
    '',
    '# ─── Backend ───────────────────────────────────────────',
    `PORT=${vars.PORT || '5000'}`,
    `MONGODB_URI=${vars.MONGODB_URI || 'mongodb://localhost:27017/archiprice'}`,
    `JWT_SECRET=${vars.JWT_SECRET}`,
    `JWT_EXPIRES_IN=${vars.JWT_EXPIRES_IN || '7d'}`,
    `FRONTEND_URL=${vars.FRONTEND_URL || 'http://localhost:5173'}`,
    '',
    '# ─── Frontend (production) ─────────────────────────────',
    '# VITE_API_URL=',
    '',
  ];
  return lines.join('\n');
}

const existing = parseEnvFile(rootEnvPath);
const backend = parseEnvFile(backendEnvPath);
const example = parseEnvFile(examplePath);

const merged = {
  ...example,
  ...existing,
  ...backend,
};

if (!merged.JWT_SECRET || merged.JWT_SECRET === 'changez-moi-en-production') {
  merged.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.log('[migrate-env] JWT_SECRET généré pour le développement local');
}

if (backend.MONGODB_URI) {
  console.log('[migrate-env] MONGODB_URI repris depuis backend/.env');
}

fs.writeFileSync(rootEnvPath, serializeEnv(merged), 'utf8');
console.log(`[migrate-env] Écrit : ${rootEnvPath}`);

if (fs.existsSync(backendEnvPath)) {
  fs.unlinkSync(backendEnvPath);
  console.log('[migrate-env] Supprimé : backend/.env');
}

console.log('[migrate-env] Terminé. Vérifiez : npm run dev:api puis curl /api/health');
