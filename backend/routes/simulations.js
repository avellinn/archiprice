import express from 'express';
import mongoose from 'mongoose';
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

function parsePrice(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isNumericOnly(value) {
  return /^\d+$/.test(String(value || '').trim());
}

function validateSimulationPayload(payload) {
  const sourceType = String(payload.sourceType || 'project-validation').trim();
  const projectName = String(payload.projectName || '').trim();
  const reference = String(payload.reference || '').trim();
  const sourceId = String(payload.sourceId || payload.projectId || '').trim();
  const totalAmount = parsePrice(payload.total);
  const products = Number(payload.products) || 0;
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (sourceType === 'project-validation') {
    if (!projectName) throw new Error('Nom du projet requis.');
    if (isNumericOnly(projectName)) throw new Error('Le nom du projet doit contenir du texte.');
    if (!reference) throw new Error('Référence du dossier requise.');
    if (!sourceId) throw new Error('Identifiant du projet requis.');
    if (totalAmount <= 0) throw new Error('Budget cible requis et doit être supérieur à 0.');
    if (products <= 0 && items.length === 0) throw new Error('Une simulation doit contenir au moins un article.');
  }

  if (items.length > 0) {
    items.forEach((item) => {
      const itemName = String(item?.name || '').trim();
      const itemQuantity = Number(item?.quantity || 0);
      const itemPrice = parsePrice(item?.price);
      const itemTotal = parsePrice(item?.total);

      if (!itemName) throw new Error('Chaque article doit avoir un nom.');
      if (itemQuantity <= 0) throw new Error('Chaque article doit avoir une quantité valide.');
      if (itemPrice <= 0) throw new Error('Chaque article doit avoir un prix valide.');
      if (itemTotal <= 0) throw new Error('Chaque article doit avoir un total valide.');
    });
  }
}

router.use(requireDb);
router.use(protect);

router.get('/my-count', async (req, res) => {
  const user = await User.findById(req.user._id).select('simulations');
  res.json({ count: Number(user?.simulations || 0) });
});

router.post('/', async (req, res) => {
  try {
    validateSimulationPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const sourceId = String(req.body.sourceId || req.body.projectId || '').trim();
  const sourceType = req.body.sourceType || 'project-validation';

  // Convertir projectId en ObjectId valide ou null pour respecter le schéma Simulation
  const normalizedProjectId = (() => {
    const raw = req.body.projectId;
    if (!raw || String(raw).trim() === '') return null;
    if (mongoose.Types.ObjectId.isValid(raw)) return new mongoose.Types.ObjectId(raw);
    return null;
  })();

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
      existing.projectId = normalizedProjectId;
      await existing.save();

      await User.findByIdAndUpdate(req.user._id, { $inc: { simulations: 1 } });
      publishCrudEvent('simulations', 'updated', { simulationId: String(existing._id) }, {
        roles: ['admin'],
        userIds: [req.user._id],
      });

      return res.status(200).json({ simulation: formatDocument(existing) });
    }
  }

  const simulation = await Simulation.create({
    userId: req.user._id,
    date: req.body.date,
    projectId: normalizedProjectId,
    projectName: req.body.projectName,
    reference: req.body.reference,
    sourceType: req.body.sourceType || 'project-validation',
    sourceId,
    total: req.body.total || '-',
    products: req.body.products ?? 0,
    status: 'Succès',
    city: req.body.city,
    coefficient: req.body.coefficient,
    avatar: req.body.avatar,
    items: Array.isArray(req.body.items) ? req.body.items : [],
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { simulations: 1 } });
  publishCrudEvent('simulations', 'created', { simulationId: String(simulation._id) }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.status(201).json({ simulation: formatDocument(simulation) });
});

router.get('/', async (req, res) => {
  try {
    const simulations = await Simulation.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ simulations: simulations.map(formatDocument) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let query = { userId: req.user._id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.sourceId = id;
    }

    const simulation = await Simulation.findOne(query);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation introuvable' });
    }

    res.json({ simulation: formatDocument(simulation) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suppression d'une simulation par l'utilisateur propriétaire
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let query = { userId: req.user._id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.sourceId = id;
    }

    const simulation = await Simulation.findOneAndDelete(query);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation introuvable.' });
    }

    publishCrudEvent('simulations', 'deleted', { simulationId: String(simulation._id) }, {
      roles: ['admin'],
      userIds: [req.user._id],
    });

    res.json({ message: 'Simulation supprimée.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
