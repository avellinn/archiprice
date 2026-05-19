const mongoose = require('mongoose');

function requireDb(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Base de données indisponible — configurez MONGODB_URI et démarrez MongoDB',
    });
  }
  next();
}

module.exports = requireDb;
