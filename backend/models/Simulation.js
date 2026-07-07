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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, trim: true },
    // Référence ObjectId vers le projet associé (null si simulation sans projet)
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null },
    projectName: { type: String, trim: true, default: '' },
    reference: { type: String, trim: true, default: '' },
    sourceType: { type: String, trim: true, default: 'simulation' },
    sourceId: { type: String, trim: true, default: '' },
    total: { type: String, trim: true, default: '-' },
    products: { type: mongoose.Schema.Types.Mixed, default: 0 },
    status: {
      type: String,
      enum: ['Succès', 'Échec'],
      default: 'Succès',
    },
    city: { type: String, trim: true, default: '' },
    coefficient: { type: String, trim: true, default: '1,00' },
    avatar: { type: String, trim: true },
    items: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model('Simulation', simulationSchema);
