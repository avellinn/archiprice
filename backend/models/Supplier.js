import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nom du fournisseur requis'],
      trim: true,
      maxlength: 160,
    },
    contact: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    region: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Cotonou',
    },
    status: {
      type: String,
      enum: ['Actif', 'Inactif'],
      default: 'Actif',
    },
    products: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Supplier', supplierSchema);
