import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import SimulationExport from '../models/SimulationExport.js';
import { publishCrudEvent } from '../services/realtimeService.js';

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDocument(doc) {
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  return { ...plain, id: String(plain._id) };
}

function parseRawNumber(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function buildExportPayload(body, userId) {
  const items = Array.isArray(body.items)
    ? body.items.map((item) => ({
        name: String(item?.name || '').trim(),
        category: String(item?.category || '').trim(),
        quantity: Number(item?.quantity) || 1,
        price: String(item?.price || '-').trim(),
        rawPrice: parseRawNumber(item?.rawPrice ?? item?.price),
        total: String(item?.total || '-').trim(),
        rawTotal: parseRawNumber(item?.rawTotal ?? item?.total),
        imageUrl: String(item?.imageUrl || '').trim(),
        shop: String(item?.shop || '').trim(),
        city: String(item?.city || '').trim(),
      }))
    : [];

  const normalizedProjectId = (() => {
    const raw = body.projectId;
    if (!raw || String(raw).trim() === '') return null;
    if (mongoose.Types.ObjectId.isValid(raw)) return new mongoose.Types.ObjectId(raw);
    return null;
  })();

  return {
    userId,
    projectId: normalizedProjectId,
    projectName: String(body.projectName || '').trim(),
    reference: String(body.reference || '').trim(),
    budget: parseRawNumber(body.budget ?? body.budgetTarget),
    estimatedTotal: parseRawNumber(body.estimatedTotal ?? body.total),
    totalFormatted: String(body.totalFormatted || body.total || '-').trim(),
    articleCount: Number(body.articleCount ?? body.products ?? items.length) || 0,
    city: String(body.city || '').trim(),
    coefficient: String(body.coefficient || '1,00').trim(),
    items,
    pdfUrl: String(body.pdfUrl || '').trim(),
    exportedAt: body.exportedAt ? new Date(body.exportedAt) : new Date(),
    exportedBy: String(body.exportedBy || body.user || '').trim(),
    exportedByEmail: String(body.exportedByEmail || body.email || '').trim().toLowerCase(),
    status: ['Succès', 'Échec', 'En attente'].includes(body.status) ? body.status : 'Succès',
  };
}

// ── Middleware ───────────────────────────────────────────────────────────────

router.use(requireDb);
router.use(protect);

// ── GET /api/simulation-exports ─────────────────────────────────────────────
// Retourne tous les exports de l'utilisateur connecté, triés du plus récent au plus ancien.

router.get('/', async (req, res) => {
  try {
    const exports = await SimulationExport
      .find({ userId: req.user._id })
      .sort({ exportedAt: -1 })
      .lean();

    res.json({
      simulationExports: exports.map((doc) => ({ ...doc, id: String(doc._id) })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/simulation-exports/count ───────────────────────────────────────
// Compte total des exports de l'utilisateur (pour le Dashboard).

router.get('/count', async (req, res) => {
  try {
    const count = await SimulationExport.countDocuments({ userId: req.user._id });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/simulation-exports/project/:projectId ──────────────────────────
// Historique des exports pour un projet précis.

router.get('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ error: 'projectId invalide.' });
  }

  try {
    const exports = await SimulationExport
      .find({ userId: req.user._id, projectId: new mongoose.Types.ObjectId(projectId) })
      .sort({ exportedAt: -1 })
      .lean();

    res.json({
      simulationExports: exports.map((doc) => ({ ...doc, id: String(doc._id) })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/simulation-exports ────────────────────────────────────────────
// Crée un nouvel export. Appelé par le frontend au moment du clic "Exporter PDF".

router.post('/', async (req, res) => {
  if (!req.body.projectName || !String(req.body.projectName).trim()) {
    return res.status(400).json({ error: 'projectName requis.' });
  }

  try {
    const payload = buildExportPayload(req.body, req.user._id);
    const simulationExport = await SimulationExport.create(payload);

    publishCrudEvent('simulation-exports', 'created', { exportId: String(simulationExport._id) }, {
      roles: ['admin'],
      userIds: [req.user._id],
    });

    res.status(201).json({ simulationExport: formatDocument(simulationExport) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /api/simulation-exports/:id/pdf ───────────────────────────────────
// Met à jour l'URL du PDF une fois le fichier stocké (Cloudinary, etc.).

router.patch('/:id/pdf', async (req, res) => {
  const { id } = req.params;
  const { pdfUrl } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'id invalide.' });
  }

  if (!pdfUrl || !String(pdfUrl).trim()) {
    return res.status(400).json({ error: 'pdfUrl requis.' });
  }

  try {
    const simulationExport = await SimulationExport.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { pdfUrl: String(pdfUrl).trim() },
      { new: true },
    );

    if (!simulationExport) {
      return res.status(404).json({ error: 'Export introuvable.' });
    }

    res.json({ simulationExport: formatDocument(simulationExport) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/simulation-exports/:id ──────────────────────────────────────
// Supprime un export. Le projet source n'est jamais affecté.

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'id invalide.' });
  }

  try {
    const simulationExport = await SimulationExport.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!simulationExport) {
      return res.status(404).json({ error: 'Export introuvable.' });
    }

    publishCrudEvent('simulation-exports', 'deleted', { exportId: String(simulationExport._id) }, {
      roles: ['admin'],
      userIds: [req.user._id],
    });

    res.json({ message: 'Export supprimé.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
