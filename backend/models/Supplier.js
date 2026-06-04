import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nom du fournisseur requis'],
      trim: true,
      maxlength: 160,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
      unique: true,
      sparse: true,
    },
    contact: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    categories: {
      type: [String],
      default: [],
    },
    logo: {
      secure_url: { type: String, trim: true },
      public_id: { type: String, trim: true },
      metadata: {
        originalName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        bytes: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        format: { type: String, trim: true },
        provider: { type: String, default: 'cloudinary' },
      },
    },
    region: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Cotonou',
    },
    status: {
      type: String,
      enum: ['Actif', 'Inactif', 'Bloqué', 'Supprimé'],
      default: 'Actif',
    },
    products: {
      type: Number,
      min: 0,
      default: 0,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

supplierSchema.pre('validate', function normalizeSupplier() {
  if (!this.companyName && this.name) this.companyName = this.name;
  if (!this.name && this.companyName) this.name = this.companyName;
});

export default mongoose.model('Supplier', supplierSchema);
