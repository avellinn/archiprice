import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import { generateProjectRecapPdf } from '../services/recapPdfService.js';

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getSafeFileName(value) {
  return String(value || 'recapitulatif')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'recapitulatif';
}

async function downloadProjectRecapPdf(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Identifiant de projet invalide' });
  }

  const project = await Project.findOne({ _id: id, user: req.user._id });
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  const products = await Product.find({ project: project._id }).sort({ createdAt: 1 });
  if (products.length === 0) {
    return res.status(400).json({ error: 'Aucun article à exporter pour ce projet' });
  }

  const pdfBuffer = generateProjectRecapPdf({
    project,
    products,
    user: req.user,
  });

  const fileName = `${getSafeFileName(project.name)}-recapitulatif.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  return res.end(pdfBuffer);
}

export {
  downloadProjectRecapPdf,
};
