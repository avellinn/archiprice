import './config/env.js';

import http from 'node:http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import seedSuperAdmin from './seeds/superAdmin.js';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

let server;

function probeHealth() {
  return new Promise((resolve) => {
    const request = http.get({ host: HOST, port: PORT, path: '/api/health', timeout: 1500 }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

function listen() {
  return new Promise((resolve, reject) => {
    const candidate = app.listen(PORT, HOST);
    const onError = (error) => {
      candidate.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      candidate.off('error', onError);
      server = candidate;
      resolve();
    };
    candidate.once('error', onError);
    candidate.once('listening', onListening);
  });
}

async function shutdown(signal) {
  console.log(`[server] ${signal} — arrêt en cours…`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

async function start() {
  console.log('[server] Démarrage…');
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[server] PORT=${PORT}`);

  if (await probeHealth()) {
    console.log(`[server] API déjà active sur http://${HOST}:${PORT} — attente avant démarrage local.`);
    // Keep the process alive and poll until the remote instance disappears.
    // This prevents nodemon from performing a clean exit when another process
    // is already bound to the configured port during development.
    // If the remote instance remains intentionally active, this process will
    // continue waiting and will not start a second server.
    while (await probeHealth()) {
      console.log('[server] Instance existante détectée — nouvelle vérification dans 2000ms...');
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  await connectDB();
  await seedSuperAdmin();
  await listen();

  console.log('[server] ─────────────────────────────────────');
  console.log(`[server] API ArchiPrice → http://${HOST}:${PORT}`);
  console.log(`[server] Health         → http://${HOST}:${PORT}/api/health`);
  console.log('[server] Logs HTTP actifs (chaque requête s’affiche ici)');
  console.log('[server] ─────────────────────────────────────');
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    console.error('[server] Erreur à l’arrêt :', err.message);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    console.error('[server] Erreur à l’arrêt :', err.message);
    process.exit(1);
  });
});

start().catch((err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} occupé par un autre service. Arrêtez ce processus ou définissez un autre PORT.`);
  }
  console.error('[server] Démarrage impossible :', err.message);
  process.exit(1);
});
