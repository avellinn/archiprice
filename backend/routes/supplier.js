import express from 'express';
import mongoose from 'mongoose';
import { protect, requireSupplier } from '../middleware/auth.js';
import { handleMulterError, mediaUpload, upload } from '../middleware/multerUpload.js';
import requireDb from '../middleware/requireDb.js';
import asyncHandler from '../utils/asyncHandler.js';
import Demande from '../models/Demande.js';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import Simulation from '../models/Simulation.js';
import Supplier from '../models/Supplier.js';
import {
  deleteProductImage,
  deleteSupplierMedia,
  uploadProductImages,
  uploadSupplierMedia,
} from '../services/cloudinaryImageService.js';
import { publishCrudEvent } from '../services/realtimeService.js';
import { validateProductClassification } from '../../shared/productTaxonomy.mjs';

const router = express.Router();

function formatSupplier(supplier) {
  if (!supplier) return null;
  const plain = supplier.toObject ? supplier.toObject() : supplier;
  return {
    ...plain,
    id: plain._id,
  };
}

function formatProduct(product) {
  return {
    id: product._id,
    projectId: product.project,
    supplierId: product.supplier,
    supplierUserId: product.supplierUser,
    name: product.name,
    description: product.description,
    category: product.category,
    subcategory: product.subcategory || '',
    room: product.room,
    range: product.range,
    availability: product.availability,
    city: product.city,
    neighborhood: product.neighborhood,
    unit: product.unit,
    unitPrice: product.unitPrice,
    priceExcludingTax: product.priceExcludingTax ?? product.unitPrice,
    vatRate: product.vatRate ?? 0,
    minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
    dimensions: product.dimensions || {},
    images: product.images || [],
    publicationStatus: product.publicationStatus || 'Brouillon',
    submittedAt: product.submittedAt,
    approvedAt: product.approvedAt,
    withdrawnAt: product.withdrawnAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function parseDimensions(value) {
  if (!value) return {};

  const source = typeof value === 'string'
    ? (() => {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    })()
    : value;

  if (!source || typeof source !== 'object') return {};

  return {
    length: String(source.length || '').trim(),
    width: String(source.width || '').trim(),
    thickness: String(source.thickness || '').trim(),
    weight: String(source.weight || '').trim(),
  };
}

function parsePrice(value) {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

function calculateTaxInclusivePrice(priceExcludingTax, vatRate) {
  return Math.round(priceExcludingTax * (1 + (vatRate / 100)) * 100) / 100;
}

async function findOrCreateSupplierProfile(user) {
  const supplier = await Supplier.findOne({ user: user._id });

  if (supplier) {
    if (supplier.status === 'Supprimé') {
      const minimal = {
        user: user._id,
        email: user.email || '',
        name: user.name || '',
        companyName: user.name || '',
        contact: user.phone || user.email || '',
        phone: user.phone || '',
        status: 'Actif',
      };

      try {
        const created = await Supplier.create(minimal);
        return created;
      } catch (err) {
        const error = new Error('Profil fournisseur introuvable ou non validé');
        error.statusCode = 403;
        error.expose = true;
        throw error;
      }
    }
    if (!supplier.user) {
      supplier.user = user._id;
      await supplier.save();
    }
    return supplier;
  }
  // In development, create a minimal supplier profile to ease local testing.
  if (process.env.NODE_ENV === 'development') {
    try {
      const minimal = {
        user: user._id,
        email: user.email || '',
        name: user.name || '',
        companyName: user.name || '',
        contact: user.phone || user.email || '',
        phone: user.phone || '',
        status: 'Actif',
      };

      const created = await Supplier.create(minimal);
      return created;
    } catch (err) {
      const error = new Error('Profil fournisseur introuvable ou non validé');
      error.statusCode = 403;
      error.expose = true;
      throw error;
    }
  }

  const error = new Error('Profil fournisseur introuvable ou non validé');
  error.statusCode = 403;
  error.expose = true;
  throw error;
}

async function findSupplierProducts(user, supplier) {
  return Product.find({
    $or: [
      { supplier: supplier._id },
      { supplierUser: user._id },
    ],
  }).sort({ updatedAt: -1 }).lean();
}

router.use(requireDb);
router.use(protect);
router.use(requireSupplier);

router.get('/me', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  res.json({ supplier: formatSupplier(supplier) });
}));

router.put('/me', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const patch = {};

  ['name', 'companyName', 'email', 'contact', 'phone', 'region', 'city', 'neighborhood', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) patch[field] = req.body[field];
  });

  if (patch.name !== undefined && !patch.name?.trim()) {
    return res.status(400).json({ error: 'Nom du fournisseur requis' });
  }
  if (patch.companyName !== undefined && !patch.companyName?.trim()) {
    return res.status(400).json({ error: 'Nom de la boutique requis' });
  }

  Object.assign(supplier, patch);
  await supplier.save();

  publishCrudEvent('suppliers', 'profile-updated', { supplierId: String(supplier._id) }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  return res.json({ supplier: formatSupplier(supplier) });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const products = await findSupplierProducts(req.user, supplier);

  res.json({ products: products.map(formatProduct) });
}));

router.get('/files', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  res.json({ files: supplier.media || [] });
}));

router.post(
  '/files',
  mediaUpload.array('file', 20),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const supplier = await findOrCreateSupplierProfile(req.user);
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'Sélectionnez au moins un fichier' });

    const uploadedFiles = await uploadSupplierMedia(files);
    supplier.media.push(...uploadedFiles);
    await supplier.save();
    publishCrudEvent('supplier-files', 'created', { supplierId: String(supplier._id) }, {
      roles: ['admin'], userIds: [req.user._id],
    });
    return res.status(201).json({ files: supplier.media });
  }),
);

router.delete('/files', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const media = [...(supplier.media || [])];

  await Promise.all(media.map((file) => (
    deleteSupplierMedia(file.public_id, file.resourceType)
  )));

  const supplierProducts = await Product.find({
    $or: [
      { supplier: supplier._id },
      { supplierUser: req.user._id },
    ],
  });

  await Promise.allSettled(supplierProducts.flatMap((product) => (
    (product.images || []).map((image) => deleteProductImage(image.public_id))
  )));

  await Promise.all(supplierProducts.map(async (product) => {
    product.images = [];
    await product.save();
  }));

  supplier.media = [];
  await supplier.save();
  publishCrudEvent('supplier-files', 'reset', {
    supplierId: String(supplier._id),
    deletedCount: media.length,
  }, { roles: ['admin'], userIds: [req.user._id] });
  return res.json({ files: [] });
}));

router.delete('/files/:fileId', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const file = supplier.media.id(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'Fichier introuvable' });
  await deleteSupplierMedia(file.public_id, file.resourceType);
  file.deleteOne();
  await supplier.save();
  publishCrudEvent('supplier-files', 'deleted', { supplierId: String(supplier._id) }, {
    roles: ['admin'], userIds: [req.user._id],
  });
  return res.json({ files: supplier.media });
}));

router.post(
  '/products',
  upload.array('image'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const supplier = await findOrCreateSupplierProfile(req.user);
    const files = req.files || [];
    const name = String(req.body.name || '').trim();
    const classification = validateProductClassification(req.body);
    const priceExcludingTax = parsePrice(req.body.priceExcludingTax ?? req.body.unitPrice ?? 0);
    const vatRate = parsePrice(req.body.vatRate ?? 0);
    const minimumOrderQuantity = parsePrice(req.body.minimumOrderQuantity ?? 1);
    const unitPrice = calculateTaxInclusivePrice(priceExcludingTax, vatRate);

    if (!name) {
      return res.status(400).json({ error: 'Nom du produit requis' });
    }

    if (!classification.valid) {
      return res.status(400).json({ error: classification.message });
    }

    if (Number.isNaN(priceExcludingTax) || priceExcludingTax < 0 || Number.isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
      return res.status(400).json({ error: 'Prix HT ou taux de TVA invalide' });
    }

    if (Number.isNaN(minimumOrderQuantity) || minimumOrderQuantity < 1) {
      return res.status(400).json({ error: 'Quantité minimale invalide' });
    }

    const images = files.length > 0
      ? await uploadProductImages(files, { source: 'supplier-product' })
      : [];

    try {
      const product = await Product.create({
        name,
        description: req.body.description,
        category: classification.category.name,
        subcategory: classification.subcategory.name,
        room: req.body.room,
        range: req.body.range,
        availability: req.body.availability,
        city: supplier.city || supplier.region || '',
        neighborhood: supplier.neighborhood || '',
        unit: req.body.unit || 'u',
        unitPrice,
        priceExcludingTax,
        vatRate,
        minimumOrderQuantity,
        dimensions: parseDimensions(req.body.dimensions),
        supplier: supplier._id,
        supplierUser: req.user._id,
        images,
      });

      supplier.products = await Product.countDocuments({
        $or: [
          { supplier: supplier._id },
          { supplierUser: req.user._id },
        ],
      });
      await supplier.save();

      publishCrudEvent('supplier-products', 'created', {
        supplierId: String(supplier._id),
        productId: String(product._id),
      }, {
        roles: ['admin'],
        userIds: [req.user._id],
      });

      res.status(201).json({ product: formatProduct(product) });
    } catch (error) {
      await Promise.allSettled(images.map((image) => deleteProductImage(image.public_id)));
      throw error;
    }
  }),
);

router.put(
  '/products/:productId',
  upload.array('image'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const supplier = await findOrCreateSupplierProfile(req.user);
    const product = await Product.findOne({
      _id: req.params.productId,
      $or: [
        { supplier: supplier._id },
        { supplierUser: req.user._id },
      ],
    });

    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    const files = req.files || [];
    const nextClassification = validateProductClassification({
      category: req.body.category ?? product.category,
      subcategory: req.body.subcategory ?? product.subcategory,
      unit: req.body.unit ?? product.unit,
    });
    const nextPriceExcludingTax = req.body.priceExcludingTax !== undefined
      ? parsePrice(req.body.priceExcludingTax)
      : (product.priceExcludingTax ?? product.unitPrice);
    const nextVatRate = req.body.vatRate !== undefined ? parsePrice(req.body.vatRate) : (product.vatRate ?? 0);
    const nextMinimumOrderQuantity = req.body.minimumOrderQuantity !== undefined
      ? parsePrice(req.body.minimumOrderQuantity)
      : (product.minimumOrderQuantity ?? 1);
    const nextUnitPrice = calculateTaxInclusivePrice(nextPriceExcludingTax, nextVatRate);

    if (!nextClassification.valid) {
      return res.status(400).json({ error: nextClassification.message });
    }

    if (Number.isNaN(nextPriceExcludingTax) || nextPriceExcludingTax < 0 || Number.isNaN(nextVatRate) || nextVatRate < 0 || nextVatRate > 100) {
      return res.status(400).json({ error: 'Prix HT ou taux de TVA invalide' });
    }

    if (Number.isNaN(nextMinimumOrderQuantity) || nextMinimumOrderQuantity < 1) {
      return res.status(400).json({ error: 'Quantité minimale invalide' });
    }

    const uploadedImages = files.length > 0
      ? await uploadProductImages(files, { source: 'supplier-product-update' })
      : [];

    try {
      ['name', 'description', 'room', 'range', 'availability', 'unit'].forEach((field) => {
        if (req.body[field] !== undefined) product[field] = req.body[field];
      });
      product.category = nextClassification.category.name;
      product.subcategory = nextClassification.subcategory.name;
      product.city = supplier.city || supplier.region || '';
      product.neighborhood = supplier.neighborhood || '';
      product.unitPrice = nextUnitPrice;
      product.priceExcludingTax = nextPriceExcludingTax;
      product.vatRate = nextVatRate;
      product.minimumOrderQuantity = nextMinimumOrderQuantity;
      if (req.body.dimensions !== undefined) {
        product.dimensions = parseDimensions(req.body.dimensions);
      }
      product.images = [...(product.images || []), ...uploadedImages];

      if (!String(product.name || '').trim()) {
        return res.status(400).json({ error: 'Nom du produit requis' });
      }

      await product.save();
      publishCrudEvent('supplier-products', 'updated', {
        supplierId: String(supplier._id),
        productId: String(product._id),
      }, {
        roles: ['admin'],
        userIds: [req.user._id],
      });
      res.json({ product: formatProduct(product) });
    } catch (error) {
      await Promise.allSettled(uploadedImages.map((image) => deleteProductImage(image.public_id)));
      throw error;
    }
  }),
);

router.delete('/products/:productId', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const product = await Product.findOne({
    _id: req.params.productId,
    $or: [
      { supplier: supplier._id },
      { supplierUser: req.user._id },
    ],
  });

    if (!product) {
    return res.status(404).json({ error: 'Produit introuvable' });
    }

  await Promise.allSettled((product.images || []).map((image) => deleteProductImage(image.public_id)));
  await product.deleteOne();

  supplier.products = await Product.countDocuments({
    $or: [
      { supplier: supplier._id },
      { supplierUser: req.user._id },
    ],
  });
  await supplier.save();

  publishCrudEvent('supplier-products', 'deleted', {
    supplierId: String(supplier._id),
    productId: String(product._id),
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.status(204).end();
}));

router.patch('/products/:productId/publication', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const nextStatus = String(req.body.publicationStatus || '').trim();
  const allowedStatuses = ['En attente', 'Retiré'];

  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ error: 'Statut de publication invalide' });
  }

  const product = await Product.findOne({
    _id: req.params.productId,
    $or: [
      { supplier: supplier._id },
      { supplierUser: req.user._id },
    ],
  });

  if (!product) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  if (nextStatus === 'En attente') {
    const classification = validateProductClassification(product);
    if (!classification.valid) {
      return res.status(400).json({ error: `${classification.message}. Corrigez la fiche avant de la soumettre.` });
    }
  }

  product.publicationStatus = nextStatus;
  if (nextStatus === 'En attente') {
    product.submittedAt = new Date();
    product.withdrawnAt = undefined;
  }
  if (nextStatus === 'Retiré') {
    product.withdrawnAt = new Date();
  }

  await product.save();
  publishCrudEvent('supplier-products', 'publication-updated', {
    supplierId: String(supplier._id),
    productId: String(product._id),
    publicationStatus: product.publicationStatus,
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  return res.json({ product: formatProduct(product) });
}));

router.delete('/products/:productId/images', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const publicId = String(req.body.publicId || '').trim();

  if (!publicId) {
    return res.status(400).json({ error: 'Identifiant Cloudinary requis' });
  }

  const product = await Product.findOne({
    _id: req.params.productId,
    $or: [
      { supplier: supplier._id },
      { supplierUser: req.user._id },
    ],
  });

  if (!product) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  const imageExists = (product.images || []).some((image) => image.public_id === publicId);
  if (!imageExists) {
    return res.status(404).json({ error: 'Image introuvable' });
  }

  await deleteProductImage(publicId);
  product.images = product.images.filter((image) => image.public_id !== publicId);
  await product.save();

  publishCrudEvent('supplier-products', 'image-deleted', {
    supplierId: String(supplier._id),
    productId: String(product._id),
    publicId,
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  return res.json({ product: formatProduct(product) });
}));

router.get('/workspace', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const products = await findSupplierProducts(req.user, supplier);

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      email: req.user.email,
      phone: req.user.phone || '',
      role: req.user.role,
    },
    supplier: formatSupplier(supplier),
    stats: {
      products: products.length,
      active: supplier.status === 'Actif',
    },
    products: products.map(formatProduct),
  });
}));

router.get('/clients/:clientId', asyncHandler(async (req, res) => {
  const supplier = await findOrCreateSupplierProfile(req.user);
  const clientId = req.params.clientId;

  const demandes = await Demande.find({
    user: clientId,
    $or: [
      { supplier: supplier._id },
      { supplierUser: req.user._id },
    ],
    hiddenBySupplier: { $ne: true },
  })
    .populate('user', 'name email phone')
    .populate('supplier', 'name companyName email contact')
    .populate('supplierUser', 'name email')
    .populate({ path: 'product', select: 'name project', populate: { path: 'project', select: 'name status budgetTarget' } })
    .sort({ lastMessageAt: -1 })
    .lean();

  const projectIds = [...new Set(
    demandes
      .map((d) => d.product?.project?._id || d.product?.project)
      .filter(Boolean)
      .map((id) => String(id)),
  )];

  const validProjectIds = projectIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  const [projects, simulations] = await Promise.all([
    validProjectIds.length > 0
      ? Project.find({ _id: { $in: validProjectIds } }).sort({ updatedAt: -1 }).lean()
      : [],
    validProjectIds.length > 0
      ? Simulation.find({ projectId: { $in: validProjectIds } }).sort({ createdAt: -1 }).lean()
      : [],
  ]);

  res.json({
    demandes: demandes.map((d) => ({
      id: String(d._id),
      status: d.status,
      lastMessage: d.messages?.length
        ? {
            message: d.messages[d.messages.length - 1].message,
            senderRole: d.messages[d.messages.length - 1].senderRole,
            createdAt: d.messages[d.messages.length - 1].createdAt,
          }
        : null,
      client: d.user ? { id: String(d.user._id), name: d.user.name, email: d.user.email } : null,
      supplier: d.supplier ? { id: String(d.supplier._id), name: d.supplier.name } : null,
      projectId: d.product?.project?._id || d.product?.project || null,
      productName: d.product?.name || d.productName || '',
    })),
    projects: projects.map((p) => ({
      id: String(p._id),
      name: p.name,
      status: p.status,
      budgetTarget: p.budgetTarget,
    })),
    simulations: simulations.map((s) => ({
      id: String(s._id),
      projectId: String(s.projectId || ''),
      projectName: s.projectName,
      total: s.total,
      date: s.date || s.createdAt,
      products: typeof s.products === 'number' ? s.products : (Array.isArray(s.items) ? s.items.length : 0),
      status: s.status,
    })),
  });
}));

export default router;
