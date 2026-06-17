import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import Simulation from '../models/Simulation.js';
import Supplier from '../models/Supplier.js';
import SupportItem from '../models/SupportItem.js';
import User from '../models/User.js';
import { deleteProductImage } from '../services/cloudinaryImageService.js';
import { publishCrudEvent } from '../services/realtimeService.js';

const router = express.Router();

const USER_ROLES = ['user', 'admin', 'supplier'];
const ADMIN_MANAGED_USER_ROLES = USER_ROLES;

function normalizeRole(role) {
  const normalizedRole = String(role || '').toLowerCase();
  return USER_ROLES.includes(normalizedRole) ? normalizedRole : 'user';
}

function roleFromType(type) {
  if (type === 'Admin') return 'admin';
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
    if (user.status === 'Actif' && supplier.status === 'Supprimé') supplier.status = 'Actif';
    return supplier.save();
  }

  return Supplier.create({
    user: user._id,
    name: user.name || email,
    email,
    contact: email,
  });
}

async function deleteProductsWithImages(filter) {
  const products = await Product.find(filter);
  const productIds = products.map((product) => product._id);
  const publicIds = products
    .flatMap((product) => product.images || [])
    .map((image) => image.public_id)
    .filter(Boolean);

  await Promise.allSettled(publicIds.map((publicId) => deleteProductImage(publicId)));
  if (productIds.length > 0) {
    await Product.deleteMany({ _id: { $in: productIds } });
  }
}

function getProductImage(product) {
  const image = (product.images || [])[0];
  return image?.secure_url || '';
}

function formatAdminProduct(product) {
  const plain = product.toObject ? product.toObject() : product;
  const supplier = plain.supplier && typeof plain.supplier === 'object' ? plain.supplier : null;
  const supplierUser = plain.supplierUser && typeof plain.supplierUser === 'object' ? plain.supplierUser : null;
  const supplierName = supplier?.companyName || supplier?.name || supplierUser?.name || supplierUser?.email || 'Fournisseur';

  return {
    id: String(plain._id),
    name: plain.name,
    description: plain.description || '',
    category: plain.category || '',
    room: plain.room || '',
    range: plain.range || '',
    availability: plain.availability || '',
    city: plain.city || supplier?.city || supplier?.region || '',
    neighborhood: plain.neighborhood || supplier?.neighborhood || '',
    unit: plain.unit || 'u',
    unitPrice: plain.unitPrice || 0,
    price: plain.unitPrice || 0,
    supplierId: supplier?._id ? String(supplier._id) : String(plain.supplier || ''),
    supplierUserId: supplierUser?._id ? String(supplierUser._id) : String(plain.supplierUser || ''),
    supplier: supplierName,
    supplierName,
    supplierStatus: supplier?.status || supplierUser?.status || 'Actif',
    image: getProductImage(plain),
    images: plain.images || [],
    publicationStatus: plain.publicationStatus || 'Brouillon',
    submittedAt: plain.submittedAt,
    approvedAt: plain.approvedAt,
    withdrawnAt: plain.withdrawnAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

async function deleteUserCascade(user) {
  const suppliers = await Supplier.find({
    $or: [
      { user: user._id },
      ...(user.email ? [{ email: user.email }] : []),
    ],
  });
  const supplierIds = suppliers.map((supplier) => supplier._id);
  const projects = await Project.find({ user: user._id }).select('_id');
  const projectIds = projects.map((project) => project._id);

  await deleteProductsWithImages({
    $or: [
      { supplierUser: user._id },
      ...(supplierIds.length ? [{ supplier: { $in: supplierIds } }] : []),
      ...(projectIds.length ? [{ project: { $in: projectIds } }] : []),
    ],
  });
  await Project.deleteMany({ user: user._id });
  await Supplier.deleteMany({ _id: { $in: supplierIds } });
  await SupportItem.deleteMany({
    $or: [
      { userId: user._id },
      ...(user.email ? [{ email: user.email }] : []),
    ],
  });
  if (user.email) await Simulation.deleteMany({ email: user.email });
  await User.deleteOne({ _id: user._id });
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
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    user.status = 'Supprimé';
    await user.save();
    await Supplier.updateMany({ user: user._id }, { status: 'Supprimé' });
    publishCrudEvent('users', 'deleted', { userId: String(user._id), role: user.role }, {
      roles: ['admin'],
      userIds: [user._id],
    });
    return res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
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
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

  const linkedUser = supplier.user ? await User.findById(supplier.user) : null;
  if (linkedUser) {
    await deleteUserCascade(linkedUser);
  } else {
    await deleteProductsWithImages({ supplier: supplier._id });
    await Supplier.deleteOne({ _id: supplier._id });
  }

  publishCrudEvent('suppliers', 'deleted', { supplierId: String(supplier._id) }, {
    roles: ['admin', 'supplier'],
    userIds: [supplier.user].filter(Boolean),
  });
  return res.json({ message: 'Fournisseur supprimé', supplier: formatAdminSupplier(supplier) });
});

router.get('/products', async (_req, res) => {
  const products = await Product.find({
    supplier: { $exists: true, $ne: null },
    publicationStatus: { $in: ['En attente', 'Validé', 'Retiré', 'Refusé'] },
  })
    .populate('supplier', 'name companyName email city region neighborhood status')
    .populate('supplierUser', 'name email status')
    .sort({ updatedAt: -1 });

  return res.json({ products: products.map(formatAdminProduct) });
});

router.patch('/products/:id', async (req, res) => {
  const allowedStatuses = ['Brouillon', 'En attente', 'Validé', 'Retiré', 'Refusé'];
  const patch = {};

  if (req.body.publicationStatus !== undefined) {
    const nextStatus = String(req.body.publicationStatus || '').trim();
    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ error: 'Statut de publication invalide' });
    }
    patch.publicationStatus = nextStatus;
    if (nextStatus === 'Validé') patch.approvedAt = new Date();
    if (nextStatus === 'Retiré') patch.withdrawnAt = new Date();
    if (nextStatus === 'En attente') patch.submittedAt = new Date();
  }

  const product = await Product.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  })
    .populate('supplier', 'name companyName email city region neighborhood status')
    .populate('supplierUser', 'name email status');

  if (!product) return res.status(404).json({ error: 'Article non trouvé' });

  publishCrudEvent('admin-products', 'updated', {
    productId: String(product._id),
    publicationStatus: product.publicationStatus,
  }, {
    roles: ['admin', 'supplier'],
    userIds: [product.supplierUser?._id || product.supplierUser].filter(Boolean),
  });

  return res.json({ product: formatAdminProduct(product) });
});

router.delete('/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Article non trouvé' });

  await Promise.allSettled((product.images || []).map((image) => deleteProductImage(image.public_id)));
  await product.deleteOne();

  if (product.supplier) {
    const count = await Product.countDocuments({ supplier: product.supplier });
    await Supplier.findByIdAndUpdate(product.supplier, { products: count });
  }

  publishCrudEvent('admin-products', 'deleted', { productId: String(product._id) }, {
    roles: ['admin', 'supplier'],
    userIds: [product.supplierUser].filter(Boolean),
  });

  return res.json({ success: true });
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
