import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email requis'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    password: {
      type: String,
      required: [true, 'Mot de passe requis'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'supplier'],
      default: 'user',
    },
    type: {
      type: String,
      trim: true,
      default: 'Architecte',
    },
    category: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    status: {
      type: String,
      enum: ['Actif', 'Inactif', 'Bloqué'],
      default: 'Actif',
    },
    simulations: {
      type: Number,
      default: 0,
      min: 0,
    },
  },

  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
