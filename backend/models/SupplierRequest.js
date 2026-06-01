import mongoose from 'mongoose';

const supplierRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Nom de l’entreprise requis'],
      trim: true,
      maxlength: 160,
    },
    email: {
      type: String,
      required: [true, 'Email requis'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
      index: true,
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
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
  },
  { timestamps: true },
);

export default mongoose.model('SupplierRequest', supplierRequestSchema, 'supplier_requests');
