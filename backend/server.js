require('./config/env');

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5055;

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
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`[server] API ArchiPrice → http://localhost:${PORT}`);
    console.log(`[server] Health       → http://localhost:${PORT}/api/health`);
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
