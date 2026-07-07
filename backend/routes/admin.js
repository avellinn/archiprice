import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import Demande from '../models/Demande.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import Simulation from '../models/Simulation.js';
import Supplier from '../models/Supplier.js';
import SupportItem from '../models/SupportItem.js';
import User from '../models/User.js';
import { deleteProductImage } from '../services/cloudinaryImageService.js';
import { cascadeDeleteUser, deleteProductsWithImages, purgeUserFromCatalogueConfig, runDbTransaction } from '../services/userService.js';
import { publishCrudEvent } from '../services/realtimeService.js';
import { validateProductClassification } from '../../shared/productTaxonomy.mjs';

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

  const supplier = await Supplier.findOne({ user: user._id });

  if (supplier) {
    if (supplier.status === 'Supprimé') {
      return Supplier.create({
        user: user._id,
        name: user.name || String(user.email || '').toLowerCase().trim(),
        email: String(user.email || '').toLowerCase().trim(),
        contact: String(user.email || '').toLowerCase().trim(),
      });
    }
    supplier.user = supplier.user || user._id;
    supplier.email = supplier.email || String(user.email || '').toLowerCase().trim();
    supplier.name = supplier.name || user.name || String(user.email || '').toLowerCase().trim();
    return supplier.save();
  }

  return Supplier.create({
    user: user._id,
    name: user.name || String(user.email || '').toLowerCase().trim(),
    email: String(user.email || '').toLowerCase().trim(),
    contact: String(user.email || '').toLowerCase().trim(),
  });
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
    subcategory: plain.subcategory || '',
    room: plain.room || '',
    range: plain.range || '',
    availability: plain.availability || '',
    city: plain.city || supplier?.city || supplier?.region || '',
    neighborhood: plain.neighborhood || supplier?.neighborhood || '',
    unit: plain.unit || 'u',
    unitPrice: plain.unitPrice || 0,
    price: plain.unitPrice || 0,
    priceExcludingTax: plain.priceExcludingTax ?? plain.unitPrice ?? 0,
    vatRate: plain.vatRate ?? 0,
    minimumOrderQuantity: plain.minimumOrderQuantity ?? 1,
    dimensions: plain.dimensions || {},
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

router.use(requireDb);
router.use(protect);
router.use(requireAdmin);

  router.get('/users', async (req, res) => {
    try {
      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
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

    await cascadeDeleteUser(user);
    publishCrudEvent('users', 'permanent-deleted', { userId: String(user._id), role: user.role }, {
      roles: ['admin'],
    });
    return res.json({ message: 'Utilisateur supprimé définitivement' });
  } catch (error) {
    console.error('[admin] Permanent delete error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

  router.get('/suppliers', async (_req, res) => {
    const suppliers = await Supplier.find({})
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

  supplier.status = 'Supprimé';
  await supplier.save();
  if (supplier.user) await User.findByIdAndUpdate(supplier.user, { status: 'Supprimé' });

  publishCrudEvent('suppliers', 'deleted', { supplierId: String(supplier._id) }, {
    roles: ['admin', 'supplier'],
    userIds: [supplier.user].filter(Boolean),
  });
  return res.json({ message: 'Fournisseur supprimé', supplier: formatAdminSupplier(supplier) });
});

router.delete('/users/:id/permanent', async (req, res) => {
  console.log('DELETE REQUEST RECEIVED (permanent delete user)');
  console.log('ID:', req.params.id);

  const user = await User.findById(req.params.id);
  console.log('DOCUMENT BEFORE DELETE:', user ? { _id: user._id, email: user.email, status: user.status } : null);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

  await cascadeDeleteUser(user);
  console.log('DELETE RESULT:', { permanentDeleted: true, userId: String(user._id) });

  const documentAfter = await User.findById(req.params.id);
  console.log('DOCUMENT AFTER DELETE:', documentAfter);

  publishCrudEvent('users', 'permanent-deleted', { userId: String(user._id), role: user.role }, {
    roles: ['admin'],
  });

  return res.json({ message: 'Utilisateur supprimé définitivement' });
});

router.delete('/suppliers/:id/permanent', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    if (supplier.user) {
      const user = await User.findById(supplier.user);
      if (user) {
        await cascadeDeleteUser(user);
      } else {
        await runDbTransaction(async (session) => {
          await deleteProductsWithImages({ supplier: supplier._id }, session);
          await Supplier.deleteOne({ _id: supplier._id }).session(session);
        });
      }
    } else {
      await runDbTransaction(async (session) => {
        await deleteProductsWithImages({ supplier: supplier._id }, session);
        await Supplier.deleteOne({ _id: supplier._id }).session(session);
      });
    }

    publishCrudEvent('suppliers', 'permanent-deleted', { supplierId: String(supplier._id) }, {
      roles: ['admin'],
    });
    return res.json({ message: 'Fournisseur supprimé définitivement' });
  } catch (error) {
    console.error('[admin] Permanent delete supplier error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/products', async (_req, res) => {
  const products = await Product.find({
    supplier: { $exists: true, $ne: null },
    publicationStatus: { $in: ['En attente', 'Validé', 'Retiré', 'Refusé'] },
  })
    .populate('supplier', 'name companyName email city region neighborhood status')
    .populate('supplierUser', 'name email status')
    .sort({ updatedAt: -1 });

  return res.json({ products: products.map(formatAdminProduct).filter((product) => product.supplierStatus !== 'Supprimé' && product.supplierUserId) });
});

router.patch('/products/:id', async (req, res) => {
  const allowedStatuses = ['Brouillon', 'En attente', 'Validé', 'Retiré', 'Refusé'];
  const patch = {};

  if (req.body.publicationStatus !== undefined) {
    const nextStatus = String(req.body.publicationStatus || '').trim();
    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ error: 'Statut de publication invalide' });
    }
    if (nextStatus === 'Validé') {
      const productToValidate = await Product.findById(req.params.id);
      if (!productToValidate) return res.status(404).json({ error: 'Article non trouvé' });
      const classification = validateProductClassification(productToValidate);
      if (!classification.valid) {
        return res.status(400).json({ error: `${classification.message}. Le fournisseur doit corriger la fiche.` });
      }
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
  const activeUserIds = await User.find({ status: { $ne: 'Supprimé' } }).distinct('_id');
  const simulations = await Simulation.find({ userId: { $in: activeUserIds } }).sort({ createdAt: -1 });
  res.json({
    simulations: simulations.map(formatDocument),
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

router.delete('/simulations', async (_req, res) => {
  const result = await Simulation.deleteMany({});
  publishCrudEvent('simulations', 'deleted', { bulk: true, deletedCount: result.deletedCount }, { roles: ['admin'] });
  return res.json({ success: true, deletedCount: result.deletedCount || 0 });
});

router.delete('/simulations/:id', async (req, res) => {
  const { id } = req.params;
  console.log('DELETE REQUEST RECEIVED (simulation)');
  console.log('ID:', id);

  if (id.startsWith('project-') || id.startsWith('exported-')) {
    console.log('DELETE RESULT:', { hidden: true, reason: 'virtual-id' });
    return res.json({ success: true, hidden: true });
  }

  const documentBefore = await Simulation.findById(id);
  console.log('DOCUMENT BEFORE DELETE:', documentBefore ? { _id: documentBefore._id, userId: documentBefore.userId } : null);

  const simulation = await Simulation.findByIdAndDelete(id);
  console.log('DELETE RESULT:', simulation ? { deleted: true } : { deleted: false });
  if (!simulation) return res.status(404).json({ error: 'Simulation non trouvée' });

  const documentAfter = await Simulation.findById(id);
  console.log('DOCUMENT AFTER DELETE:', documentAfter);

  publishCrudEvent('simulations', 'deleted', { simulationId: String(simulation._id) }, { roles: ['admin'] });
  return res.json({ success: true });
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
  const supportItem = await SupportItem.findById(req.params.id);
  if (!supportItem) return res.status(404).json({ error: 'Demande support non trouvée' });
  const nextReply = String(req.body.reply || '').trim();
  if (nextReply && nextReply !== supportItem.reply) {
    supportItem.messages.push({
      sender: req.user._id,
      senderRole: 'admin',
      senderName: req.user.name || req.user.email || 'Administration',
      message: nextReply,
    });
    supportItem.reply = nextReply;
    supportItem.unreadForOwner += 1;
    supportItem.unreadForAdmin = 0;
  }
  if (req.body.status !== undefined) supportItem.status = req.body.status;
  await supportItem.save();
  publishCrudEvent('support-items', 'updated', { supportItemId: String(supportItem._id) }, {
    roles: ['admin'],
    userIds: [supportItem.userId].filter(Boolean),
  });
  return res.json({ supportItem: formatDocument(supportItem) });
});

router.delete('/support-items/:id', async (req, res) => {
  console.log('DELETE REQUEST RECEIVED (support-item)');
  console.log('ID:', req.params.id);

  const documentBefore = await SupportItem.findById(req.params.id);
  console.log('DOCUMENT BEFORE DELETE:', documentBefore ? { _id: documentBefore._id, userId: documentBefore.userId } : null);

  const supportItem = await SupportItem.findByIdAndDelete(req.params.id);
  console.log('DELETE RESULT:', supportItem ? { deleted: true } : { deleted: false });
  if (!supportItem) return res.status(404).json({ error: 'Demande support non trouvée' });

  const documentAfter = await SupportItem.findById(req.params.id);
  console.log('DOCUMENT AFTER DELETE:', documentAfter);

  publishCrudEvent('support-items', 'deleted', { supportItemId: String(supportItem._id) }, { roles: ['admin'] });
  return res.json({ success: true });
});


router.get('/test', (req, res) => {
  res.json({ message: 'Backoffice Archiprice opérationnel' });
});

export default router;
