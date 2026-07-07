import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Product from '../models/Product.js';
import Simulation from '../models/Simulation.js';
import { publishCrudEvent } from '../services/realtimeService.js';

function formatProject(project) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    budgetTarget: project.budgetTarget,
    clientName: project.clientName,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function isNumericOnly(value) {
  return /^\d+$/.test(String(value || '').trim());
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getProjects(req, res) {
  const projects = await Project.find({ user: req.user._id }).sort({ updatedAt: -1 });
  res.json({ projects: projects.map(formatProject) });
}

async function createProject(req, res) {
  const { name, description, clientName, status, budgetTarget } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nom du projet requis' });
  }

  if (isNumericOnly(name)) {
    return res.status(400).json({ error: 'Le nom du projet doit contenir du texte.' });
  }

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || undefined,
    clientName: clientName?.trim() || undefined,
    status,
    budgetTarget: budgetTarget ?? 0,
    user: req.user._id,
  });

  const projectDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  await Simulation.create({
    userId: req.user._id,
    date: projectDate,
    projectId: project._id,
    projectName: project.name,
    reference: `SIM-${project._id}`,
    sourceType: 'project',
    sourceId: String(project._id),
    total: '-',
    products: 0,
    status: 'Succès',
  });

  publishCrudEvent('projects', 'created', { projectId: String(project._id) }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.status(201).json({ project: formatProject(project) });
}

async function updateProject(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Identifiant de projet invalide' });
  }

  const project = await Project.findOne({ _id: id, user: req.user._id });

  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  const { name, description, clientName, status, budgetTarget } = req.body;

  if (String(project.status).toLowerCase() === 'treated') {
    if (status === 'treated') {
      return res.status(409).json({ error: 'Ce projet est déjà traité. Il ne peut pas être validé une seconde fois.' });
    }
    if (budgetTarget !== undefined) {
      return res.status(400).json({ error: 'Le budget cible d\'un projet traité ne peut pas être modifié.' });
    }
    if (status === 'draft') {
      return res.status(400).json({ error: 'Un projet traité ne peut pas revenir à l\'état Brouillon.' });
    }
  }

  if (name !== undefined) {
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Le nom du projet ne peut pas être vide' });
    }
    if (isNumericOnly(name)) {
      return res.status(400).json({ error: 'Le nom du projet doit contenir du texte.' });
    }
    project.name = name.trim();
  }

  if (description !== undefined) {
    project.description = description?.trim() || undefined;
  }

  if (clientName !== undefined) {
    project.clientName = clientName?.trim() || undefined;
  }

  if (status !== undefined) {
    project.status = status;
  }

  if (budgetTarget !== undefined) {
    project.budgetTarget = budgetTarget ?? 0;
  }

  await project.save();

  publishCrudEvent('projects', 'updated', { projectId: String(project._id) }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.json({ project: formatProject(project) });
}

async function deleteProject(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Identifiant de projet invalide' });
  }

  const project = await Project.findOneAndDelete({ _id: id, user: req.user._id });

  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }

  await Product.deleteMany({ project: project._id });

  publishCrudEvent('projects', 'deleted', { projectId: String(project._id) }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.json({ message: 'Projet supprimé' });
}

async function resetProjects(req, res) {
  const projects = await Project.find({ user: req.user._id }).select('_id');
  const projectIds = projects.map((project) => project._id);

  if (projectIds.length > 0) {
    await Promise.all([
      Product.deleteMany({ project: { $in: projectIds } }),
      Project.deleteMany({ _id: { $in: projectIds } }),
    ]);
  }

  publishCrudEvent('projects', 'deleted', { bulk: true, deletedCount: projectIds.length }, {
    roles: ['admin'],
    userIds: [req.user._id],
  });

  res.json({ message: 'Projets réinitialisés', deletedCount: projectIds.length });
}

export {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  resetProjects,
};
