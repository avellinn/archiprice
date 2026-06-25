import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderRole: { type: String, enum: ['user', 'supplier', 'admin'], required: true },
  senderName: { type: String, trim: true, maxlength: 160, default: '' },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
}, { timestamps: true });

const supportItemSchema = new mongoose.Schema(
  {
    tab: {
      type: String,
      enum: ['tickets', 'feedback', 'priceReports'],
      required: true,
      default: 'tickets',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceRole: {
      type: String,
      enum: ['user', 'supplier', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['Ouvert', 'En cours', 'Résolu'],
      default: 'Ouvert',
    },
    type: {
      type: String,
      trim: true,
      default: 'Question',
    },
    date: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    reply: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    messages: { type: [supportMessageSchema], default: [] },
    unreadForOwner: { type: Number, min: 0, default: 0 },
    unreadForAdmin: { type: Number, min: 0, default: 1 },
  },
  { timestamps: true },
);

export default mongoose.model('SupportItem', supportItemSchema);