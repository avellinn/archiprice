const mongoose = require('mongoose');
const Project = require('../models/Project');
const Product = require('../models/Product');

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
  const { name, description, category, unit, unitPrice } = req.body;

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
    project: projectId,
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

  const { name, description, category, unit, unitPrice } = req.body;

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

  await product.save();

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

  res.json({ message: 'Produit supprimé' });
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
