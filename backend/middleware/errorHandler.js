function notFound(_req, res) {
  res.status(404).json({ error: 'Route introuvable' });
}

function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message || err);

  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Erreur serveur';

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
