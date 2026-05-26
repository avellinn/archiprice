import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import Simulation from '../models/Simulation.js';
import Supplier from '../models/Supplier.js';
import SupportItem from '../models/SupportItem.js';
import User from '../models/User.js';

const router = express.Router();

function formatAdminUser(user) {
  const type = user.type || (String(user.role).toLowerCase() === 'admin' ? 'Admin' : 'Architecte');
  const role = String(user.role).toLowerCase() === 'admin' || type === 'Admin' ? 'admin' : 'user';

  return {
    id: String(user._id),
    name: user.name || user.email,
    email: user.email,
    role,
    type,
    simulations: role === 'admin' ? '-' : user.simulations || 0,
    inscription: new Intl.DateTimeFormat('fr-FR').format(user.createdAt || new Date()),
    status: user.status || 'Actif',
    subscription: role === 'admin' ? '-' : user.subscription || 'Essai',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function formatDocument(document) {
  const plain = document.toObject ? document.toObject() : document;
  return {
    ...plain,
    id: plain._id,
  };
}

router.use(requireDb);
router.use(protect);
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users.map(formatAdminUser));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/users', async (req, res) => {
  const { name, email, type = 'Architecte', status = 'Actif', subscription = 'Essai' } = req.body;

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nom et email requis' });
  }

  try {
    const role = type === 'Admin' ? 'admin' : 'user';
    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password: `Archiprice-${Date.now()}`,
      role,
      type,
      status,
      subscription: role === 'admin' ? '-' : subscription,
    });

    return res.status(201).json(formatAdminUser(user));
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(formatAdminUser(user));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(formatAdminUser(user));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/users/:id', async (req, res) => {
  const patch = {};
  ['name', 'type', 'status', 'subscription', 'simulations'].forEach((field) => {
    if (req.body[field] !== undefined) patch[field] = req.body[field];
  });

  if (patch.type) {
    patch.role = patch.type === 'Admin' ? 'admin' : 'user';
    if (patch.role === 'admin') patch.subscription = '-';
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    return res.json(formatAdminUser(user));
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    return res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/suppliers', async (_req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json({ suppliers: suppliers.map(formatDocument) });
});

router.post('/suppliers', async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ supplier: formatDocument(supplier) });
});

router.put('/suppliers/:id', async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });
  return res.json({ supplier: formatDocument(supplier) });
});

router.delete('/suppliers/:id', async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });
  return res.json({ message: 'Fournisseur supprimé' });
});

router.get('/simulations', async (_req, res) => {
  const simulations = await Simulation.find().sort({ createdAt: -1 });
  res.json({ simulations: simulations.map(formatDocument) });
});

router.post('/simulations', async (req, res) => {
  const simulation = await Simulation.create(req.body);
  res.status(201).json({ simulation: formatDocument(simulation) });
});

router.patch('/simulations/:id', async (req, res) => {
  const simulation = await Simulation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!simulation) return res.status(404).json({ error: 'Simulation non trouvée' });
  return res.json({ simulation: formatDocument(simulation) });
});

router.get('/support-items', async (_req, res) => {
  const supportItems = await SupportItem.find().sort({ createdAt: -1 });
  res.json({ supportItems: supportItems.map(formatDocument) });
});

router.post('/support-items', async (req, res) => {
  const supportItem = await SupportItem.create(req.body);
  res.status(201).json({ supportItem: formatDocument(supportItem) });
});

router.patch('/support-items/:id', async (req, res) => {
  const supportItem = await SupportItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supportItem) return res.status(404).json({ error: 'Demande support non trouvée' });
  return res.json({ supportItem: formatDocument(supportItem) });
});


router.get('/test', (req, res) => {
  res.json({ message: 'Backoffice Archiprice opérationnel' });
});

export default router;
