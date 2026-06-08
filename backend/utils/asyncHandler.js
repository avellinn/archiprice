export default function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (err.code === 11000) {
        return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
      }

      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
          .map((e) => e.message)
          .join(', ');
        return res.status(400).json({ error: message });
      }

      if (err.message === 'JWT_SECRET non configuré') {
        return res.status(500).json({ error: 'Configuration serveur incomplète' });
      }

      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.expose ? err.message : 'Erreur serveur' });
      }

      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    });
  };
}
