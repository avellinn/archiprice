import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    secure_url: {
      type: String,
      required: true,
      trim: true,
    },
    public_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    metadata: {
      originalName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      bytes: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      format: { type: String, trim: true },
      provider: { type: String, default: 'cloudinary' },
      folder: { type: String, default: 'archiprice/products' },
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nom du produit requis'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    room: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    range: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    availability: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    neighborhood: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    unit: {
      type: String,
      enum: ['u', 'm2', 'ml', 'm3', 'h', 'forfait'],
      default: 'u',
    },
    unitPrice: {
      type: Number,
      required: [true, 'Prix unitaire requis'],
      min: [0, 'Le prix unitaire doit être positif ou nul'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    supplierUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    publicationStatus: {
      type: String,
      enum: ['Brouillon', 'En attente', 'Validé', 'Retiré', 'Refusé'],
      default: 'Brouillon',
      index: true,
    },
    submittedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    withdrawnAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Product', productSchema);
