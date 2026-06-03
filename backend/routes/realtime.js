import express from 'express';
import { protect } from '../middleware/auth.js';
import { addRealtimeClient } from '../services/realtimeService.js';

const router = express.Router();

router.get('/realtime', protect, (req, res) => {
  addRealtimeClient(req, res);
});

export default router;
