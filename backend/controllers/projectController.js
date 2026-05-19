const mongoose = require('mongoose');
const Project = require('../models/Project');

function formatProject(project) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    clientName: project.clientName,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getProjects(req, res) {
  const projects = await Project.find({ user: req.user._id }).sort({ updatedAt: -1 });
  res.json({ projects: projects.map(formatProject) });
}

async function createProject(req, res) {
  const { name, description, clientName, status } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nom du projet requis' });
  }

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || undefined,
    clientName: clientName?.trim() || undefined,
    status,
    user: req.user._id,
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

  const { name, description, clientName, status } = req.body;

  if (name !== undefined) {
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Le nom du projet ne peut pas être vide' });
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

  await project.save();

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

  res.json({ message: 'Projet supprimé' });
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
};
