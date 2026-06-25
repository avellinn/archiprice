import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import Demande from '../models/Demande.js';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import Supplier from '../models/Supplier.js';
import { publishCrudEvent } from '../services/realtimeService.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

function formatMessage(message) {
  const plain = message.toObject ? message.toObject() : message;

  return {
    id: String(plain._id || plain.id),
    senderRole: plain.senderRole,
    senderName: plain.senderName || '',
    message: plain.message,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function formatDemande(demande) {
  const plain = demande.toObject ? demande.toObject() : demande;
  const supplier = plain.supplier && typeof plain.supplier === 'object' ? plain.supplier : null;
  const supplierUser = plain.supplierUser && typeof plain.supplierUser === 'object' ? plain.supplierUser : null;
  const product = plain.product && typeof plain.product === 'object' ? plain.product : null;

  return {
    id: String(plain._id),
    sourceNotificationId: String(plain._id),
    supplierId: String(supplier?._id || plain.supplier || ''),
    supplierUserId: String(supplierUser?._id || plain.supplierUser || ''),
    supplierName: plain.supplierName || supplier?.companyName || supplier?.name || supplierUser?.name || 'Boutique',
    supplierContact: plain.supplierContact || supplier?.contact || supplier?.email || supplierUser?.email || '',
    supplierLogo: supplier?.logo?.secure_url || supplier?.logo?.url || '',
    clientId: String(plain.user?._id || plain.user || ''),
    clientName: plain.clientName || plain.user?.name || 'Client ArchiPrice',
    clientEmail: plain.clientEmail || plain.user?.email || '',
    productId: String(product?._id || plain.product || ''),
    productName: plain.productName || product?.name || '',
    projectId: plain.projectId || String(product?.project?._id || product?.project || ''),
    projectName: plain.projectName || product?.project?.name || 'Projet non renseigné',
    type: 'Demande',
    status: plain.status || 'Nouveau',
    message: plain.messages?.[0]?.message || '',
    messages: (plain.messages || []).map(formatMessage),
    unreadForUser: plain.unreadForUser || 0,
    unreadForSupplier: plain.unreadForSupplier || 0,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

async function findSupplierForPayload(payload) {
  const supplierId = String(payload.supplierId || '').trim();
  const supplierContact = String(payload.supplierContact || '').trim().toLowerCase();
  const supplierName = String(payload.supplierName || payload.shopName || '').trim();

  if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
    const supplier = await Supplier.findById(supplierId);
    if (supplier) return supplier;
  }

  if (supplierContact || supplierName) {
    const supplier = await Supplier.findOne({
      $or: [
        ...(supplierContact ? [{ email: supplierContact }, { contact: supplierContact }] : []),
        ...(supplierName ? [{ name: supplierName }, { companyName: supplierName }] : []),
      ],
    });
    if (supplier) return supplier;
  }

  return null;
}

router.use(requireDb);
router.use(protect);

router.get('/me', asyncHandler(async (req, res) => {
  const supplier = req.user.role === 'supplier'
    ? await Supplier.findOne({ user: req.user._id })
    : null;

  const query = req.user.role === 'supplier'
    ? {
      $or: [
        ...(supplier ? [{ supplier: supplier._id }] : []),
        { supplierUser: req.user._id },
      ],
      hiddenBySupplier: { $ne: true },
    }
    : {
      user: req.user._id,
      hiddenByUser: { $ne: true },
    };

  const demandes = await Demande.find(query)
    .populate('user', 'name email phone')
    .populate('supplier', 'name companyName email contact phone city region neighborhood status logo')
    .populate('supplierUser', 'name email status')
    .populate({ path: 'product', select: 'name project', populate: { path: 'project', select: 'name' } })
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  res.json({ demandes: demandes.map(formatDemande) });
}));

router.post('/', asyncHandler(async (req, res) => {
  if (req.user.role === 'supplier') {
    return res.status(403).json({ error: 'Un fournisseur ne peut pas créer une demande client' });
  }

  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message requis' });

  const supplier = await findSupplierForPayload(req.body);
  if (!supplier) return res.status(404).json({ error: 'Fournisseur introuvable' });

  const productId = String(req.body.productId || '').trim();
  const product = productId && mongoose.Types.ObjectId.isValid(productId) ? await Product.findById(productId) : null;
  const requestedProjectId = String(req.body.projectId || product?.project || '').trim();
  const project = requestedProjectId && mongoose.Types.ObjectId.isValid(requestedProjectId)
    ? await Project.findOne({ _id: requestedProjectId, user: req.user._id })
    : null;
  const projectId = String(project?._id || req.body.projectId || '').trim();
  const projectName = String(project?.name || req.body.projectName || '').trim();
  const now = new Date();

  const existingDemande = await Demande.findOne({
    user: req.user._id,
    supplier: supplier._id,
    ...(projectId ? { projectId } : product?._id ? { product: product._id } : {}),
    status: { $nin: ['Clôturé', 'Archivé'] },
  }).sort({ lastMessageAt: -1 });

  if (existingDemande) {
    const lastMessage = existingDemande.messages.at(-1);
    if (lastMessage?.message !== message || lastMessage?.senderRole !== 'user') {
      existingDemande.messages.push({
        sender: req.user._id,
        senderRole: 'user',
        senderName: req.user.name || req.user.email || 'Client ArchiPrice',
        message,
        readByUserAt: now,
      });
      existingDemande.status = 'En cours';
      existingDemande.lastMessageAt = now;
      existingDemande.unreadForSupplier += 1;
      await existingDemande.save();
      publishCrudEvent('demandes', 'message-created', { demandeId: String(existingDemande._id) }, {
        roles: ['admin'], userIds: [req.user._id, existingDemande.supplierUser].filter(Boolean),
      });
    }
    const populatedExisting = await Demande.findById(existingDemande._id)
      .populate('user', 'name email phone')
      .populate('supplier', 'name companyName email contact phone city region neighborhood status logo')
      .populate('supplierUser', 'name email status')
      .populate({ path: 'product', select: 'name project', populate: { path: 'project', select: 'name' } });
    return res.status(200).json({ demande: formatDemande(populatedExisting) });
  }

  const demande = await Demande.create({
    user: req.user._id,
    supplier: supplier._id,
    supplierUser: supplier.user,
    product: product?._id,
    clientName: req.user.name || req.user.email || 'Client ArchiPrice',
    clientEmail: req.user.email || '',
    supplierName: supplier.companyName || supplier.name || req.body.supplierName || 'Boutique',
    supplierContact: supplier.contact || supplier.email || req.body.supplierContact || '',
    productName: product?.name || req.body.productName || '',
    projectId,
    projectName,
    status: 'Nouveau',
    messages: [{
      sender: req.user._id,
      senderRole: 'user',
      senderName: req.user.name || req.user.email || 'Client ArchiPrice',
      message,
      readByUserAt: now,
    }],
    lastMessageAt: now,
    unreadForSupplier: 1,
  });

  publishCrudEvent('demandes', 'created', {
    demandeId: String(demande._id),
    supplierId: String(supplier._id),
  }, {
    roles: ['admin', 'supplier'],
    userIds: [req.user._id, supplier.user].filter(Boolean),
  });

  const populatedDemande = await Demande.findById(demande._id)
    .populate('user', 'name email phone')
    .populate('supplier', 'name companyName email contact phone city region neighborhood status logo')
    .populate('supplierUser', 'name email status')
    .populate({ path: 'product', select: 'name project', populate: { path: 'project', select: 'name' } });

  res.status(201).json({ demande: formatDemande(populatedDemande) });
}));

router.post('/:demandeId/messages', asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message requis' });

  const demande = await Demande.findById(req.params.demandeId);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable' });

  const supplier = req.user.role === 'supplier'
    ? await Supplier.findOne({
      $or: [
        { _id: demande.supplier },
        { user: req.user._id },
        { email: String(req.user.email || '').toLowerCase().trim() },
      ],
    })
    : null;
  const isOwnerUser = String(demande.user) === String(req.user._id);
  const isOwnerSupplier = Boolean(supplier)
    && (String(demande.supplier) === String(supplier._id) || String(demande.supplierUser || '') === String(req.user._id));

  if (!isOwnerUser && !isOwnerSupplier) {
    return res.status(403).json({ error: 'Accès refusé à cette demande' });
  }

  const senderRole = req.user.role === 'supplier' ? 'supplier' : 'user';
  demande.messages.push({
    sender: req.user._id,
    senderRole,
    senderName: supplier?.companyName || supplier?.name || req.user.name || req.user.email || '',
    message,
    readByUserAt: senderRole === 'user' ? new Date() : undefined,
    readBySupplierAt: senderRole === 'supplier' ? new Date() : undefined,
  });
  demande.status = senderRole === 'supplier' ? 'Répondu' : 'Lu';
  demande.lastMessageAt = new Date();
  demande.unreadForUser = senderRole === 'supplier' ? demande.unreadForUser + 1 : 0;
  demande.unreadForSupplier = senderRole === 'user' ? demande.unreadForSupplier + 1 : 0;
  await demande.save();

  publishCrudEvent('demandes', 'message-created', { demandeId: String(demande._id) }, {
    roles: ['admin'],
    userIds: [demande.user, demande.supplierUser].filter(Boolean),
  });

  const populatedDemande = await Demande.findById(demande._id)
    .populate('user', 'name email phone')
    .populate('supplier', 'name companyName email contact phone city region neighborhood status logo')
    .populate('supplierUser', 'name email status')
    .populate({ path: 'product', select: 'name project', populate: { path: 'project', select: 'name' } });

  res.status(201).json({ demande: formatDemande(populatedDemande) });
}));

router.patch('/:demandeId/read', asyncHandler(async (req, res) => {
  const demande = await Demande.findById(req.params.demandeId);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable' });

  const supplier = req.user.role === 'supplier'
    ? await Supplier.findOne({ $or: [{ _id: demande.supplier }, { user: req.user._id }] })
    : null;
  const isOwnerUser = String(demande.user) === String(req.user._id);
  const isOwnerSupplier = Boolean(supplier)
    && (String(demande.supplier) === String(supplier._id) || String(demande.supplierUser || '') === String(req.user._id));
  if (!isOwnerUser && !isOwnerSupplier) return res.status(403).json({ error: 'Accès refusé' });

  const now = new Date();
  if (isOwnerSupplier) {
    demande.unreadForSupplier = 0;
    demande.messages.forEach((item) => {
      if (item.senderRole === 'user' && !item.readBySupplierAt) item.readBySupplierAt = now;
    });
  } else {
    demande.unreadForUser = 0;
    demande.messages.forEach((item) => {
      if (item.senderRole === 'supplier' && !item.readByUserAt) item.readByUserAt = now;
    });
  }
  await demande.save();
  publishCrudEvent('demandes', 'read', { demandeId: String(demande._id) }, {
    userIds: [demande.user, demande.supplierUser].filter(Boolean),
  });
  return res.json({ success: true });
}));

export default router;
