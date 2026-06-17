import './config/env.js';

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import seedSuperAdmin from './seeds/superAdmin.js';

const PORT = process.env.PORT || 5000;

let server;

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

  await connectDB();
  await seedSuperAdmin();

  server = app.listen(PORT, '127.0.0.1', () => {
    console.log('[server] ─────────────────────────────────────');
    console.log(`[server] API ArchiPrice → http://127.0.0.1:${PORT}`);
    console.log(`[server] Health         → http://127.0.0.1:${PORT}/api/health`);
    console.log('[server] Logs HTTP actifs (chaque requête s’affiche ici)');
    console.log('[server] ─────────────────────────────────────');
  });
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
  console.error('[server] Démarrage impossible :', err.message);
  process.exit(1);
});
