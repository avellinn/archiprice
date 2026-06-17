import mongoose from 'mongoose';

const demandeMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['user', 'supplier', 'admin'],
      required: true,
    },
    senderName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    message: {
      type: String,
      required: [true, 'Message requis'],
      trim: true,
      maxlength: 4000,
    },
    readByUserAt: {
      type: Date,
    },
    readBySupplierAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

const demandeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    clientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
      default: '',
    },
    supplierName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    supplierContact: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    productName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    status: {
      type: String,
      enum: ['Nouveau', 'En cours', 'Répondu', 'Clôturé', 'Archivé'],
      default: 'Nouveau',
      index: true,
    },
    messages: {
      type: [demandeMessageSchema],
      default: [],
      validate: {
        validator(messages) {
          return Array.isArray(messages) && messages.length > 0;
        },
        message: 'Une demande doit contenir au moins un message',
      },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadForUser: {
      type: Number,
      min: 0,
      default: 0,
    },
    unreadForSupplier: {
      type: Number,
      min: 0,
      default: 0,
    },
    hiddenByUser: {
      type: Boolean,
      default: false,
    },
    hiddenBySupplier: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

demandeSchema.pre('validate', function syncDemandState() {
  const lastMessage = this.messages?.at(-1);
  if (lastMessage?.createdAt) {
    this.lastMessageAt = lastMessage.createdAt;
  } else if (!this.lastMessageAt) {
    this.lastMessageAt = new Date();
  }

  if (!this.clientName && lastMessage?.senderRole === 'user') {
    this.clientName = lastMessage.senderName || this.clientName;
  }
  if (!this.supplierName && lastMessage?.senderRole === 'supplier') {
    this.supplierName = lastMessage.senderName || this.supplierName;
  }
});

demandeSchema.index({ user: 1, supplier: 1, updatedAt: -1 });
demandeSchema.index({ supplier: 1, status: 1, updatedAt: -1 });
demandeSchema.index({ supplierUser: 1, updatedAt: -1 });

export default mongoose.model('Demande', demandeSchema);
