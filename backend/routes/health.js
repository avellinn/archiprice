const express = require('express');
const { getDbStatus } = require('../config/db');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: getDbStatus(),
  });
});

module.exports = router;
