import express from 'express';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import Simulation from '../models/Simulation.js';
import User from '../models/User.js';
import { publishCrudEvent } from '../services/realtimeService.js';

const router = express.Router();

function formatDocument(document) {
  const plain = document.toObject ? document.toObject() : document;
  return {
    ...plain,
    id: plain._id,
  };
}

router.use(requireDb);
router.use(protect);

router.post('/', async (req, res) => {
  const sourceId = req.body.sourceId || req.body.projectId || '';
  const sourceType = req.body.sourceType || 'project-validation';

  if (sourceId && sourceType) {
    const existing = await Simulation.findOne({ sourceId, sourceType, userId: req.user._id });
    if (existing) {
      existing.userId = req.user._id;
      existing.date = req.body.date || existing.date;
      existing.projectName = req.body.projectName || existing.projectName;
      existing.reference = req.body.reference || existing.reference;
      existing.total = req.body.total || existing.total;
      existing.products = req.body.products ?? existing.products;
      existing.status = req.body.status || existing.status;
      existing.city = req.body.city || existing.city;
      existing.coefficient = req.body.coefficient || existing.coefficient;
      existing.avatar = req.body.avatar || existing.avatar;
      if (Array.isArray(req.body.items)) existing.items = req.body.items;
      await existing.save();

      await User.findByIdAndUpdate(req.user._id, { $inc: { simulations: 1 } });
      publishCrudEvent('simulations', 'updated', { simulationId: String(existing._id) }, { roles: ['admin'] });

      return res.status(200).json({ simulation: formatDocument(existing) });
    }
  }

  const simulation = await Simulation.create({
    ...req.body,
    userId: req.user._id,
    status: 'Succès',
    sourceType: req.body.sourceType || 'project-validation',
    sourceId: req.body.sourceId || req.body.projectId || '',
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { simulations: 1 } });
  publishCrudEvent('simulations', 'created', { simulationId: String(simulation._id) }, { roles: ['admin'] });

  res.status(201).json({ simulation: formatDocument(simulation) });
});

export default router;
