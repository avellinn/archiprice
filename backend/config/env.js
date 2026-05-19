const path = require('path');
const dotenv = require('dotenv');

const rootEnv = path.resolve(__dirname, '../../.env');
const backendEnv = path.resolve(__dirname, '../.env');

// Racine archi-price/.env (recommandé), puis backend/.env en surcharge locale
dotenv.config({ path: rootEnv });
dotenv.config({ path: backendEnv });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

module.exports = { requireEnv };
