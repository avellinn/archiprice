import express from 'express';
import { getDbStatus } from '../config/db.js';

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

export default router;
