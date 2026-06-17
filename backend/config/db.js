import mongoose from 'mongoose';
import Demande from '../models/Demande.js';
import PasswordResetToken from '../models/PasswordResetToken.js';

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 10,
  bufferCommands: false,
};

let dbStatus = 'not_configured';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function statusFromReadyState(readyState) {
  switch (readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return dbStatus === 'unavailable' ? 'unavailable' : 'disconnected';
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (isProduction()) {
      throw new Error('MONGODB_URI requis en production');
    }
    console.warn('[db] MONGODB_URI non défini — API sans base de données');
    dbStatus = 'not_configured';
    return;
  }

  try {
    await mongoose.connect(uri, CONNECT_OPTIONS);
    await ensureCoreCollections();
    dbStatus = 'connected';
    console.log('[db] MongoDB connecté');
  } catch (err) {
    dbStatus = 'unavailable';
    console.error(`[db] Échec de connexion MongoDB : ${err.message}`);
    if (isProduction()) {
      throw err;
    }
    console.warn('[db] MongoDB indisponible — API démarrée en mode dégradé');
  }
}

async function ensureCoreCollections() {
  const collections = [Demande, PasswordResetToken];

  await Promise.all(collections.map(async (model) => {
    try {
      await model.createCollection();
    } catch (err) {
      if (err.codeName !== 'NamespaceExists' && err.code !== 48) {
        throw err;
      }
    }
    await model.syncIndexes();
  }));
}

mongoose.connection.on('connected', () => {
  dbStatus = 'connected';
});

mongoose.connection.on('disconnected', () => {
  if (process.env.MONGODB_URI && dbStatus !== 'unavailable') {
    dbStatus = 'disconnected';
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`[db] Erreur de connexion : ${err.message}`);
  if (mongoose.connection.readyState !== 1) {
    dbStatus = 'disconnected';
  }
});

function getDbStatus() {
  if (!process.env.MONGODB_URI) {
    return { status: 'not_configured', readyState: mongoose.connection.readyState };
  }

  const { readyState } = mongoose.connection;
  return {
    status: statusFromReadyState(readyState),
    readyState,
  };
}

async function disconnectDB() {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.connection.close();
  dbStatus = 'disconnected';
  console.log('[db] MongoDB déconnecté');
}

export { connectDB, disconnectDB, getDbStatus };
