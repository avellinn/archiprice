import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import SupplierRequest from '../models/SupplierRequest.js';
import { publishCrudEvent } from '../services/realtimeService.js';
import generateToken from '../utils/generateToken.js';

function getRedirectTo(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'supplier') return '/supplier/dashboard';
  return '/dashboard';
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    type: user.type,
    phone: user.phone || '',
    status: user.status,
    redirectTo: getRedirectTo(user.role),
    createdAt: user.createdAt,
  };
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];

  return categories
    .map((category) => String(category || '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

async function ensureSupplierProfile(user, payload = {}) {
  if (user.role !== 'supplier') return null;

  const email = String(user.email || '').toLowerCase().trim();
  const existingSupplier = await Supplier.findOne({
    $or: [
      { user: user._id },
      ...(email ? [{ email }] : []),
    ],
  });

  if (existingSupplier) {
    let changed = false;
    if (!existingSupplier.user) {
      existingSupplier.user = user._id;
      changed = true;
    }
    if (!existingSupplier.email && email) {
      existingSupplier.email = email;
      changed = true;
    }
    if (changed) await existingSupplier.save();
    return existingSupplier;
  }

  return Supplier.create({
    user: user._id,
    name: payload.name?.trim() || user.name || email,
    email,
    contact: payload.contact?.trim() || email,
    region: payload.region?.trim() || undefined,
  });
}

function sendAuthResponse(res, user, statusCode = 200) {
  const token = generateToken(user._id, user.role);
  res.status(statusCode).json({
    token,
    user: formatUser(user),
  });
}

async function register(req, res) {
  const {
    name,
    email,
    password,
    accountType = 'user',
    companyName,
    phone,
    categories,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const user = await User.create({
    name: name?.trim() || companyName?.trim() || undefined,
    email,
    phone: phone?.trim() || undefined,
    password,
    role: 'user',
    type: accountType === 'supplier' ? 'Fournisseur' : 'Architecte',
  });

  if (accountType === 'supplier') {
    if (!companyName?.trim()) {
      await User.deleteOne({ _id: user._id });
      return res.status(400).json({ error: 'Nom de la boutique requis pour une demande fournisseur' });
    }

    const supplierRequest = await SupplierRequest.create({
      user: user._id,
      companyName: companyName.trim(),
      email: user.email,
      phone: phone?.trim() || undefined,
      categories: normalizeCategories(categories),
    });
    publishCrudEvent('supplier-requests', 'created', {
      requestId: String(supplierRequest._id),
      userId: String(user._id),
    }, { roles: ['admin'] });
  }

  publishCrudEvent('users', 'registered', { userId: String(user._id), role: user.role }, {
    roles: ['admin'],
    userIds: [user._id],
  });

  sendAuthResponse(res, user, 201);
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  if (user.status !== 'Actif') {
    return res.status(403).json({
      error: user.status === 'Bloqué'
        ? 'Votre compte est bloqué. Contactez le support ArchiPrice.'
        : 'Votre compte est désactivé. Contactez le support ArchiPrice.',
    });
  }

  if (user.type === 'Fournisseur' && user.role !== 'supplier') {
    return res.status(403).json({ error: 'Votre demande fournisseur est en attente de validation admin.' });
  }

  await ensureSupplierProfile(user);
  sendAuthResponse(res, user);
}

async function getMe(req, res) {
  res.json({ user: formatUser(req.user) });
}

export { register, login, getMe };
