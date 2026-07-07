import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Product from '../models/Product.js';
import { deleteProductImage } from '../services/cloudinaryImageService.js';
import { publishCrudEvent } from '../services/realtimeService.js';

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function findOwnedProject(projectId, userId) {
  if (!isValidObjectId(projectId)) {
    return null;
  }
  return Project.findOne({ _id: projectId, user: userId });
}

function formatProduct(product) {
  return {
    id: product._id,
    projectId: product.project,
    catalogueProductId: product.catalogueProductId || '',
    sourceProductId: product.catalogueProductId || '',
    name: product.name,
    description: product.description,
    category: product.category,
    subcategory: product.subcategory || '',
    unit: product.unit,
    unitPrice: product.unitPrice,
    priceExcludingTax: product.priceExcludingTax ?? product.unitPrice,
    vatRate: product.vatRate ?? 0,
    minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
    dimensions: product.dimensions || {},
    images: product.images || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function parseDimensions(value) {
  if (!value) return {};
  if (typeof value !== 'object') return {};

  return {
    length: String(value.length || '').trim(),
    width: String(value.width || '').trim(),
    thickness: String(value.thickness || '').trim(),
    weight: String(value.weight || '').trim(),
  };
}

async function getProducts(req, res) {
  const { projectId } = req.params;

  const project = await findOwnedProject(projectId, req.user._id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  const products = await Product.find({ project: projectId }).sort({ name: 1 });
  res.json({ products: products.map(formatProduct) });
}

async function createProduct(req, res) {
  const { projectId } = req.params;
  const { name, description, category, subcategory, unit, unitPrice, priceExcludingTax, vatRate, minimumOrderQuantity, images, dimensions, catalogueProductId } = req.body;

  const project = await findOwnedProject(projectId, req.user._id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  if (project.status === 'treated') {
    return res.status(403).json({ error: "Les articles d'un projet traité ne peuvent pas être modifiés." });
  }

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nom du produit requis' });
  }

  if (unitPrice === undefined || unitPrice === null || Number.isNaN(Number(unitPrice))) {
    return res.status(400).json({ error: 'Prix unitaire requis' });
  }

  const price = Number(unitPrice);
  if (price < 0) {
    return res.status(400).json({ error: 'Le prix unitaire doit être positif ou nul' });
  }

  const product = await Product.create({
    name: name.trim(),
    description: description?.trim() || undefined,
    category: category?.trim() || undefined,
    subcategory: subcategory?.trim() || undefined,
    unit,
    unitPrice: price,
    priceExcludingTax: Number(priceExcludingTax ?? price),
    vatRate: Number(vatRate ?? 0),
    minimumOrderQuantity: Number(minimumOrderQuantity ?? 1),
    dimensions: parseDimensions(dimensions),
    catalogueProductId: catalogueProductId ? String(catalogueProductId) : undefined,
    images: Array.isArray(images) ? images : [],
    project: projectId,
  });

  publishCrudEvent('project-products', 'created', {
    projectId: String(project._id),
    productId: String(product._id),
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.status(201).json({ product: formatProduct(product) });
}

async function updateProduct(req, res) {
  const { projectId, id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Identifiant de produit invalide' });
  }

  const project = await findOwnedProject(projectId, req.user._id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  if (project.status === 'treated') {
    return res.status(403).json({ error: "Les articles d'un projet traité ne peuvent pas être modifiés." });
  }

  const product = await Product.findOne({ _id: id, project: projectId });
  if (!product) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  const { name, description, category, subcategory, unit, unitPrice, priceExcludingTax, vatRate, minimumOrderQuantity, images, dimensions, catalogueProductId } = req.body;

  if (name !== undefined) {
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Le nom du produit ne peut pas être vide' });
    }
    product.name = name.trim();
  }

  if (description !== undefined) {
    product.description = description?.trim() || undefined;
  }

  if (category !== undefined) {
    product.category = category?.trim() || undefined;
  }

  if (subcategory !== undefined) {
    product.subcategory = subcategory?.trim() || undefined;
  }

  if (unit !== undefined) {
    product.unit = unit;
  }

  if (unitPrice !== undefined) {
    if (unitPrice === null || Number.isNaN(Number(unitPrice))) {
      return res.status(400).json({ error: 'Prix unitaire invalide' });
    }
    const price = Number(unitPrice);
    if (price < 0) {
      return res.status(400).json({ error: 'Le prix unitaire doit être positif ou nul' });
    }
    product.unitPrice = price;
  }

  if (priceExcludingTax !== undefined) product.priceExcludingTax = Number(priceExcludingTax);
  if (vatRate !== undefined) product.vatRate = Number(vatRate);
  if (minimumOrderQuantity !== undefined) product.minimumOrderQuantity = Number(minimumOrderQuantity);

  if (images !== undefined) {
    product.images = Array.isArray(images) ? images : [];
  }

  if (dimensions !== undefined) {
    product.dimensions = parseDimensions(dimensions);
  }

  if (catalogueProductId !== undefined) {
    product.catalogueProductId = catalogueProductId ? String(catalogueProductId) : undefined;
  }

  await product.save();

  publishCrudEvent('project-products', 'updated', {
    projectId: String(project._id),
    productId: String(product._id),
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.json({ product: formatProduct(product) });
}

async function deleteProduct(req, res) {
  const { projectId, id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Identifiant de produit invalide' });
  }

  const project = await findOwnedProject(projectId, req.user._id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  if (project.status === 'treated') {
    return res.status(403).json({ error: "Les articles d'un projet traité ne peuvent pas être modifiés." });
  }

  const product = await Product.findOneAndDelete({ _id: id, project: projectId });

  if (!product) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  await Promise.allSettled((product.images || []).map((image) => (
    image.public_id ? deleteProductImage(image.public_id) : Promise.resolve()
  )));

  publishCrudEvent('project-products', 'deleted', {
    projectId: String(project._id),
    productId: String(product._id),
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.json({ message: 'Produit supprimé' });
}

async function deleteProductImageByPublicId(req, res) {
  const { projectId, id } = req.params;
  const { publicId } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Identifiant de produit invalide' });
  }

  const project = await findOwnedProject(projectId, req.user._id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  if (project.status === 'treated') {
    return res.status(403).json({ error: "Les articles d'un projet traité ne peuvent pas être modifiés." });
  }

  const product = await Product.findOne({ _id: id, project: projectId });
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

  publishCrudEvent('project-products', 'image-deleted', {
    projectId: String(project._id),
    productId: String(product._id),
    publicId,
  }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  return res.json({ product: formatProduct(product) });
}

export {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImageByPublicId,
};
