import mongoose from 'mongoose';

const simulationItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    quantity: { type: String, trim: true },
    price: { type: String, trim: true },
    total: { type: String, trim: true },
  },
  { _id: false },
);

const simulationSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    date: { type: String, trim: true },
    total: { type: String, trim: true, default: '-' },
    products: { type: mongoose.Schema.Types.Mixed, default: 0 },
    status: {
      type: String,
      enum: ['Succès', 'Échec'],
      default: 'Succès',
    },
    city: { type: String, trim: true, default: 'Cotonou' },
    coefficient: { type: String, trim: true, default: '1,00' },
    avatar: { type: String, trim: true },
    items: {
      type: [simulationItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model('Simulation', simulationSchema);
