const mongoose = require('mongoose');

let dbStatus = 'not_configured';

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[db] MONGODB_URI non défini — API sans base de données');
    dbStatus = 'not_configured';
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    dbStatus = 'connected';
    console.log('[db] MongoDB connecté');
  } catch (err) {
    dbStatus = 'unavailable';
    console.warn(`[db] MongoDB indisponible — poursuite sans DB : ${err.message}`);
  }
}

mongoose.connection.on('connected', () => {
  dbStatus = 'connected';
});

mongoose.connection.on('disconnected', () => {
  if (process.env.MONGODB_URI) {
    dbStatus = 'disconnected';
  }
});

function getDbStatus() {
  return dbStatus;
}

module.exports = { connectDB, getDbStatus };
