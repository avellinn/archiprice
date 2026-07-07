import mongoose from 'mongoose';

/**
 * Instantané d'un article au moment de l'export.
 * Stocké tel quel pour conserver l'état exact du catalogue au moment du clic.
 */
const exportItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1, min: 0 },
    price: { type: String, trim: true, default: '-' },   // formaté FCFA (lisible)
    rawPrice: { type: Number, default: 0, min: 0 },      // valeur brute pour calculs
    total: { type: String, trim: true, default: '-' },
    rawTotal: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    shop: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

/**
 * SimulationExport — un événement d'export PDF.
 *
 * Représente l'état exact du projet au moment où l'utilisateur a cliqué
 * sur "Exporter PDF". Indépendant du modèle Project : si le projet évolue
 * (budget modifié, articles changés), les exports précédents restent
 * fidèles à ce qui a été réellement généré.
 *
 * Relations :
 *   User (1) ──< SimulationExport (N)
 *   Project (1) ──< SimulationExport (N)   [ref non bloquante — le projet peut être supprimé]
 */
const simulationExportSchema = new mongoose.Schema(
  {
    // ── Propriétaire ──────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId requis'],
      index: true,
    },

    // ── Projet source (ref souple — peut devenir orphelin si projet supprimé) ──
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
      default: null,
    },

    // ── Instantané du projet au moment de l'export ────────────────────────
    // Ces champs ne doivent JAMAIS être mis à jour après création.
    projectName: {
      type: String,
      trim: true,
      required: [true, 'projectName requis'],
      maxlength: 200,
    },
    reference: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },
    // Budget cible au moment de l'export (en valeur brute, FCFA)
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Estimation max calculée (somme des articles)
    estimatedTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Représentation formatée conservée pour l'affichage (ex : "5 336 760 FCFA")
    totalFormatted: {
      type: String,
      trim: true,
      default: '-',
    },
    articleCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    coefficient: {
      type: String,
      trim: true,
      default: '1,00',
    },

    // ── Articles exportés (snapshot complet) ─────────────────────────────
    items: {
      type: [exportItemSchema],
      default: [],
    },

    // ── Lien vers le PDF généré (Cloudinary ou chemin interne) ───────────
    // Vide tant que le PDF n'a pas été stocké côté serveur.
    pdfUrl: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Méta-export ───────────────────────────────────────────────────────
    exportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    exportedBy: {
      // Nom affiché de l'utilisateur au moment de l'export
      type: String,
      trim: true,
      default: '',
    },
    exportedByEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // ── Statut ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['Succès', 'Échec', 'En attente'],
      default: 'Succès',
    },
  },
  { timestamps: true },
);

// Index composé pour récupérer rapidement tous les exports d'un utilisateur triés par date
simulationExportSchema.index({ userId: 1, exportedAt: -1 });

// Index composé pour lister les exports d'un projet précis
simulationExportSchema.index({ projectId: 1, exportedAt: -1 });

export default mongoose.model('SimulationExport', simulationExportSchema);
