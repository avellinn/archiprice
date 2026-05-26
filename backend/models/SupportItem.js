import mongoose from 'mongoose';

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
    user: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
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
  },
  { timestamps: true },
);

export default mongoose.model('SupportItem', supportItemSchema);
