import express from 'express';
import { protect, requireSupplier } from '../middleware/auth.js';
import { handleMulterError, upload } from '../middleware/multerUpload.js';
import requireDb from '../middleware/requireDb.js';
import asyncHandler from '../utils/asyncHandler.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import {
  deleteProductImage,
  uploadProductImages,
} from '../services/cloudinaryImageService.js';
import { publishCrudEvent } from '../services/realtimeService.js';

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
    room: product.room,
    range: product.range,
    availability: product.availability,
    city: product.city,
    neighborhood: product.neighborhood,
    unit: product.unit,
    unitPrice: product.unitPrice,
    images: product.images || [],
    publicationStatus: product.publicationStatus || 'Brouillon',
    submittedAt: product.submittedAt,
    approvedAt: product.approvedAt,
    withdrawnAt: product.withdrawnAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
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

async function findOrCreateSupplierProfile(user) {
  const email = String(user.email || '').toLowerCase().trim();
  let supplier = await Supplier.findOne({
    $or: [
      { user: user._id },
      ...(email ? [{ email }] : []),
    ],
  });

  if (supplier) {
    let changed = false;
    if (!supplier.user) {
      supplier.user = user._id;
      changed = true;
    }
    if (!supplier.email && email) {
      supplier.email = email;
      changed = true;
    }
    if (changed) await supplier.save();
    return supplier;
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

router.post(
  '/products',
  upload.array('image'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const supplier = await findOrCreateSupplierProfile(req.user);
    const files = req.files || [];
    const name = String(req.body.name || '').trim();
    const unitPrice = parsePrice(req.body.unitPrice || 0);

    if (!name) {
      return res.status(400).json({ error: 'Nom du produit requis' });
    }

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ error: 'Prix unitaire invalide' });
    }

    const images = files.length > 0
      ? await uploadProductImages(files, { source: 'supplier-product' })
      : [];

    try {
      const product = await Product.create({
        name,
        description: req.body.description,
        category: req.body.category,
        room: req.body.room,
        range: req.body.range,
        availability: req.body.availability,
        city: supplier.city || supplier.region || '',
        neighborhood: supplier.neighborhood || '',
        unit: req.body.unit || 'u',
        unitPrice,
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
    const nextUnitPrice = req.body.unitPrice !== undefined
      ? parsePrice(req.body.unitPrice || 0)
      : product.unitPrice;

    if (Number.isNaN(nextUnitPrice) || nextUnitPrice < 0) {
      return res.status(400).json({ error: 'Prix unitaire invalide' });
    }

    const uploadedImages = files.length > 0
      ? await uploadProductImages(files, { source: 'supplier-product-update' })
      : [];

    try {
      ['name', 'description', 'category', 'room', 'range', 'availability', 'unit'].forEach((field) => {
        if (req.body[field] !== undefined) product[field] = req.body[field];
      });
      product.city = supplier.city || supplier.region || '';
      product.neighborhood = supplier.neighborhood || '';
      product.unitPrice = nextUnitPrice;
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

export default router;
