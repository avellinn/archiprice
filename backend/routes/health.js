const express = require('express');
const { getDbStatus } = require('../config/db');

const router = express.Router();

router.get('/health', (_req, res) => {
  const db = getDbStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: db.status,
    databaseReadyState: db.readyState,
  });
});

module.exports = router;
