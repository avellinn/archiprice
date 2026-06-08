import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import Simulation from '../models/Simulation.js';
import Supplier from '../models/Supplier.js';
import SupplierRequest from '../models/SupplierRequest.js';
import SupportItem from '../models/SupportItem.js';
import User from '../models/User.js';
import { publishCrudEvent } from '../services/realtimeService.js';

const router = express.Router();

const USER_ROLES = ['user', 'admin', 'supplier'];
const ADMIN_MANAGED_USER_ROLES = ['user', 'admin'];

function normalizeRole(role) {
  const normalizedRole = String(role || '').toLowerCase();
  return USER_ROLES.includes(normalizedRole) ? normalizedRole : 'user';
}

function roleFromType(type) {
  if (type === 'Admin') return 'admin';
  if (type === 'Fournisseur') return 'supplier';
  return 'user';
}

function typeFromRole(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'supplier') return 'Fournisseur';
  return 'Architecte';
}

function formatAdminUser(user, supplier = null) {
  const role = normalizeRole(user.role);
  const type = role === 'user' ? user.type || typeFromRole(role) : typeFromRole(role);
  const hasUsageStats = role === 'user';
  const formattedSupplier = supplier ? formatAdminSupplier(supplier) : null;

  return {
    id: String(user._id),
    name: role === 'supplier'
      ? formattedSupplier?.companyName || formattedSupplier?.name || user.name || user.email
      : user.name || user.email,
    email: user.email,
    phone: user.phone || formattedSupplier?.phone || '',
    role,
    type,
    category: user.category || type,
    supplier: formattedSupplier,
    shopName: formattedSupplier?.companyName || formattedSupplier?.name || '',
    simulations: hasUsageStats ? user.simulations || 0 : '-',
    inscription: new Intl.DateTimeFormat('fr-FR').format(user.createdAt || new Date()),
    status: user.status || 'Actif',
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

function parseProjectBudget(description = '') {
  const budgetMatch = String(description || '').match(/Estimation budget\s*:\s*(.+)/i);
  if (!budgetMatch) return 0;

  const amount = Number(String(budgetMatch[1]).replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatProjectAsSimulation(project) {
  const plain = project.toObject ? project.toObject() : project;
  const user = plain.user && typeof plain.user === 'object' ? plain.user : null;
  const totalAmount = parseProjectBudget(plain.description);

  return {
    id: `project-${String(plain._id)}`,
    projectId: String(plain._id),
    user: user?.name || plain.clientName || user?.email || 'Utilisateur ArchiPrice',
    email: user?.email || 'Compte user',
    avatar: String(user?.name || user?.email || 'AP').slice(0, 2).toUpperCase(),
    date: new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(plain.updatedAt || plain.createdAt || new Date()),
    total: `${new Intl.NumberFormat('fr-FR').format(totalAmount)} FCFA`,
    products: 0,
    status: plain.status === 'archived' ? 'Succès' : 'En cours',
    city: plain.name || '-',
    coefficient: '1,00',
    items: [],
    source: 'project',
  };
}

function formatSupplierRequest(request) {
  const plain = request.toObject ? request.toObject() : request;
  return {
    ...plain,
    id: String(plain._id),
  };
}

function formatAdminSupplier(supplier, productCount) {
  const plain = supplier.toObject ? supplier.toObject() : supplier;
  const user = plain.user && typeof plain.user === 'object' ? plain.user : null;

  return {
    ...plain,
    id: String(plain._id),
    userId: user?._id ? String(user._id) : String(plain.user || ''),
    name: plain.companyName || plain.name || user?.name || plain.email,
    companyName: plain.companyName || plain.name || user?.name || '',
    email: plain.email || user?.email || '',
    contact: plain.contact || plain.email || user?.email || '',
    phone: plain.phone || user?.phone || '',
    region: plain.region || '',
    status: plain.status || 'Actif',
    products: productCount ?? plain.products ?? 0,
    isRecommended: Boolean(plain.isRecommended),
  };
}

async function ensureSupplierProfile(user) {
  if (user.role !== 'supplier') return null;

  const email = String(user.email || '').toLowerCase().trim();
  const supplier = await Supplier.findOne({
    $or: [
      { user: user._id },
      ...(email ? [{ email }] : []),
    ],
  });

  if (supplier) {
    supplier.user = supplier.user || user._id;
    supplier.email = supplier.email || email;
    supplier.name = supplier.name || user.name || email;
    return supplier.save();
  }

  return Supplier.create({
    user: user._id,
    name: user.name || email,
    email,
    contact: email,
  });
}

router.use(requireDb);
router.use(protect);
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const suppliers = await Supplier.find({ user: { $in: users.map((user) => user._id) } });
    const supplierByUserId = new Map(suppliers.map((supplier) => [String(supplier.user), supplier]));

    res.json(users.map((user) => formatAdminUser(user, supplierByUserId.get(String(user._id)))));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/users', async (req, res) => {
  const {
    name,
    email,
    phone,
    role: requestedRole,
    type,
    category,
    status = 'Actif',
  } = req.body;

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nom et email requis' });
  }

  if (requestedRole !== undefined && !ADMIN_MANAGED_USER_ROLES.includes(String(requestedRole).toLowerCase())) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  if (type === 'Fournisseur') {
    return res.status(400).json({ error: 'Le rôle supplier nécessite une demande fournisseur validée' });
  }

  try {
    const role = requestedRole ? normalizeRole(requestedRole) : roleFromType(type);
    const normalizedCategory = String(category || type || typeFromRole(role)).trim();
    const normalizedType = type || normalizedCategory || typeFromRole(role);
    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || undefined,
      password: `Archiprice-${Date.now()}`,
      role,
      type: normalizedType,
      category: normalizedCategory,
      status,
    });
    await ensureSupplierProfile(user);

    publishCrudEvent('users', 'created', { userId: String(user._id), role: user.role }, {
      roles: ['admin'],
      userIds: [user._id],
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
    const supplier = await Supplier.findOne({ user: user._id });
    res.json(formatAdminUser(user, supplier));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


router.put('/users/:id/role', async (req, res) => {
  const role = String(req.body.role || '').toLowerCase();
  if (!ADMIN_MANAGED_USER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        role,
        type: typeFromRole(role),
      },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    await ensureSupplierProfile(user);
    publishCrudEvent('users', 'role-updated', { userId: String(user._id), role: user.role }, {
      roles: ['admin'],
      userIds: [user._id],
    });
    res.json(formatAdminUser(user));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/users/:id', async (req, res) => {
  const patch = {};
  ['name', 'email', 'phone', 'type', 'category', 'status', 'simulations'].forEach((field) => {
    if (req.body[field] !== undefined) patch[field] = req.body[field];
  });

  if (patch.category && !patch.type) patch.type = patch.category;

  if (patch.type) {
    if (patch.type === 'Fournisseur') {
      return res.status(400).json({ error: 'Le rôle supplier nécessite une demande fournisseur validée' });
    }
    patch.role = roleFromType(patch.type);
  }

  if (req.body.role !== undefined) {
    const requestedRole = String(req.body.role || '').toLowerCase();
    if (!ADMIN_MANAGED_USER_ROLES.includes(requestedRole)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    patch.role = requestedRole;
    patch.type = patch.type || typeFromRole(requestedRole);
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    await ensureSupplierProfile(user);
    publishCrudEvent('users', 'updated', { userId: String(user._id), role: user.role }, {
      roles: ['admin'],
      userIds: [user._id],
    });
    return res.json(formatAdminUser(user));
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    await Supplier.deleteOne({ user: user._id });
    publishCrudEvent('users', 'deleted', { userId: String(user._id), role: user.role }, {
      roles: ['admin'],
      userIds: [user._id],
    });
    return res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/supplier-requests', async (_req, res) => {
  const requests = await SupplierRequest.find().sort({ createdAt: -1 });
  res.json({ requests: requests.map(formatSupplierRequest) });
});

router.post('/supplier-requests/:id/approve', async (req, res) => {
  const supplierRequest = await SupplierRequest.findById(req.params.id);
  if (!supplierRequest) return res.status(404).json({ error: 'Demande fournisseur introuvable' });
  if (supplierRequest.status !== 'pending') {
    return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
  }

  const user = await User.findById(supplierRequest.user);
  if (!user) return res.status(404).json({ error: 'Utilisateur lié introuvable' });

  user.role = 'supplier';
  user.type = 'Fournisseur';
  user.category = user.category || supplierRequest.categories?.[0] || 'Fournisseur';
  user.status = 'Actif';
  await user.save();

  let supplier = await Supplier.findOne({
    $or: [
      { user: user._id },
      { email: supplierRequest.email },
    ],
  });

  if (supplier) {
    supplier.user = user._id;
    supplier.name = supplierRequest.companyName;
    supplier.companyName = supplierRequest.companyName;
    supplier.email = supplierRequest.email;
    supplier.phone = supplierRequest.phone;
    supplier.contact = supplierRequest.phone || supplierRequest.email;
    supplier.categories = supplierRequest.categories;
    supplier.status = 'Actif';
    supplier.approvedBy = req.user._id;
    supplier.approvedAt = new Date();
    await supplier.save();
  } else {
    supplier = await Supplier.create({
      user: user._id,
      name: supplierRequest.companyName,
      companyName: supplierRequest.companyName,
      email: supplierRequest.email,
      phone: supplierRequest.phone,
      contact: supplierRequest.phone || supplierRequest.email,
      categories: supplierRequest.categories,
      status: 'Actif',
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });
  }

  supplierRequest.status = 'approved';
  supplierRequest.reviewedBy = req.user._id;
  supplierRequest.reviewedAt = new Date();
  supplierRequest.supplier = supplier._id;
  await supplierRequest.save();

  publishCrudEvent('supplier-requests', 'approved', {
    requestId: String(supplierRequest._id),
    supplierId: String(supplier._id),
    userId: String(user._id),
  }, {
    roles: ['admin'],
    userIds: [user._id],
  });

  return res.json({
    request: formatSupplierRequest(supplierRequest),
    user: formatAdminUser(user),
    supplier: formatDocument(supplier),
  });
});

router.post('/supplier-requests/:id/reject', async (req, res) => {
  const supplierRequest = await SupplierRequest.findById(req.params.id);
  if (!supplierRequest) return res.status(404).json({ error: 'Demande fournisseur introuvable' });
  if (supplierRequest.status !== 'pending') {
    return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
  }

  supplierRequest.status = 'rejected';
  supplierRequest.reviewedBy = req.user._id;
  supplierRequest.reviewedAt = new Date();
  supplierRequest.rejectionReason = req.body.reason?.trim() || undefined;
  await supplierRequest.save();

  publishCrudEvent('supplier-requests', 'rejected', {
    requestId: String(supplierRequest._id),
    userId: String(supplierRequest.user || ''),
  }, {
    roles: ['admin'],
    userIds: [supplierRequest.user].filter(Boolean),
  });

  return res.json({ request: formatSupplierRequest(supplierRequest) });
});

router.get('/suppliers', async (_req, res) => {
  const suppliers = await Supplier.find({ status: { $ne: 'Supprimé' } })
    .populate('user', 'name email phone role status')
    .sort({ name: 1 });
  const productCounts = await Product.aggregate([
    { $match: { supplier: { $in: suppliers.map((supplier) => supplier._id) } } },
    { $group: { _id: '$supplier', count: { $sum: 1 } } },
  ]);
  const productCountBySupplier = new Map(productCounts.map((item) => [String(item._id), item.count]));

  res.json({
    suppliers: suppliers.map((supplier) => (
      formatAdminSupplier(supplier, productCountBySupplier.get(String(supplier._id)))
    )),
  });
});

router.post('/suppliers', async (req, res) => {
  const supplier = await Supplier.create(req.body);
  publishCrudEvent('suppliers', 'created', { supplierId: String(supplier._id) }, { roles: ['admin'] });
  res.status(201).json({ supplier: formatAdminSupplier(supplier) });
});

router.put('/suppliers/:id', async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

  if (supplier.user && req.body.status) {
    await User.findByIdAndUpdate(supplier.user, {
      status: req.body.status === 'Supprimé' ? 'Bloqué' : req.body.status,
    });
  }

  publishCrudEvent('suppliers', 'updated', { supplierId: String(supplier._id) }, {
    roles: ['admin', 'supplier'],
    userIds: [supplier.user].filter(Boolean),
  });
  return res.json({ supplier: formatAdminSupplier(supplier) });
});

router.delete('/suppliers/:id', async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, { status: 'Supprimé' }, {
    new: true,
    runValidators: true,
  });
  if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });
  if (supplier.user) {
    await User.findByIdAndUpdate(supplier.user, { status: 'Bloqué' });
  }
  publishCrudEvent('suppliers', 'deleted', { supplierId: String(supplier._id) }, {
    roles: ['admin', 'supplier'],
    userIds: [supplier.user].filter(Boolean),
  });
  return res.json({ message: 'Fournisseur masqué', supplier: formatAdminSupplier(supplier) });
});

router.get('/simulations', async (_req, res) => {
  const [simulations, projects] = await Promise.all([
    Simulation.find().sort({ createdAt: -1 }),
    Project.find().populate('user', 'name email').sort({ updatedAt: -1 }),
  ]);
  res.json({
    simulations: [
      ...simulations.map(formatDocument),
      ...projects.map(formatProjectAsSimulation),
    ],
  });
});

router.post('/simulations', async (req, res) => {
  const simulation = await Simulation.create(req.body);
  publishCrudEvent('simulations', 'created', { simulationId: String(simulation._id) }, { roles: ['admin'] });
  res.status(201).json({ simulation: formatDocument(simulation) });
});

router.patch('/simulations/:id', async (req, res) => {
  const simulation = await Simulation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!simulation) return res.status(404).json({ error: 'Simulation non trouvée' });
  publishCrudEvent('simulations', 'updated', { simulationId: String(simulation._id) }, { roles: ['admin'] });
  return res.json({ simulation: formatDocument(simulation) });
});

router.get('/support-items', async (_req, res) => {
  const supportItems = await SupportItem.find({
    userId: { $exists: true, $ne: null },
    sourceRole: { $in: ['user', 'supplier'] },
  }).sort({ createdAt: -1 });
  res.json({ supportItems: supportItems.map(formatDocument) });
});

router.post('/support-items', async (req, res) => {
  const supportItem = await SupportItem.create(req.body);
  publishCrudEvent('support-items', 'created', { supportItemId: String(supportItem._id) }, { roles: ['admin'] });
  res.status(201).json({ supportItem: formatDocument(supportItem) });
});

router.patch('/support-items/:id', async (req, res) => {
  const supportItem = await SupportItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supportItem) return res.status(404).json({ error: 'Demande support non trouvée' });
  publishCrudEvent('support-items', 'updated', { supportItemId: String(supportItem._id) }, { roles: ['admin'] });
  return res.json({ supportItem: formatDocument(supportItem) });
});

router.delete('/support-items/:id', async (req, res) => {
  const supportItem = await SupportItem.findByIdAndDelete(req.params.id);
  if (!supportItem) return res.status(404).json({ error: 'Demande support non trouvée' });
  publishCrudEvent('support-items', 'deleted', { supportItemId: String(supportItem._id) }, { roles: ['admin'] });
  return res.json({ success: true });
});


router.get('/test', (req, res) => {
  res.json({ message: 'Backoffice Archiprice opérationnel' });
});

export default router;
