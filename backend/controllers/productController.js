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
    name: product.name,
    description: product.description,
    category: product.category,
    unit: product.unit,
    unitPrice: product.unitPrice,
    images: product.images || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
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
  const { name, description, category, unit, unitPrice, images } = req.body;

  const project = await findOwnedProject(projectId, req.user._id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
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
    unit,
    unitPrice: price,
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

  const product = await Product.findOne({ _id: id, project: projectId });
  if (!product) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  const { name, description, category, unit, unitPrice, images } = req.body;

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

  if (images !== undefined) {
    product.images = Array.isArray(images) ? images : [];
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
