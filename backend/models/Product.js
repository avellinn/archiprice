const mongoose = require('mongoose');

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
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Product', productSchema);
