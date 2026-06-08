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
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    role: user.role,
    type: user.type,
    category: user.category || user.type || '',
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
    if (user.category && !(existingSupplier.categories || []).includes(user.category)) {
      existingSupplier.categories = [user.category, ...(existingSupplier.categories || [])];
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
    categories: normalizeCategories([
      user.category,
      payload.category,
      ...(Array.isArray(payload.categories) ? payload.categories : []),
    ]),
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
    category,
    categories,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const profileCategory = String(category || '').trim();
  const officialCategory = profileCategory || (accountType === 'supplier' ? 'Fournisseur' : 'Architecte');
  const user = await User.create({
    name: name?.trim() || companyName?.trim() || undefined,
    email,
    phone: phone?.trim() || undefined,
    password,
    role: 'user',
    type: accountType === 'supplier' ? 'Fournisseur' : officialCategory,
    category: officialCategory,
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
      categories: normalizeCategories([
        profileCategory,
        ...(Array.isArray(categories) ? categories : []),
      ]),
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

async function updateMe(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  const nextEmail = req.body.email !== undefined
    ? String(req.body.email || '').toLowerCase().trim()
    : user.email;
  const nextName = req.body.name !== undefined
    ? String(req.body.name || '').trim()
    : user.name;

  if (!nextEmail) {
    return res.status(400).json({ error: 'Email requis' });
  }

  if (nextEmail !== user.email) {
    const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
    }
  }

  user.name = nextName || user.name;
  user.email = nextEmail;
  if (req.body.phone !== undefined) user.phone = String(req.body.phone || '').trim();
  if (req.body.firstName !== undefined) user.firstName = String(req.body.firstName || '').trim();
  if (req.body.lastName !== undefined) user.lastName = String(req.body.lastName || '').trim();
  if (req.body.category !== undefined) {
    user.category = String(req.body.category || '').trim();
    if (user.role === 'user' && user.category) user.type = user.category;
  }
  await user.save();

  if (user.role === 'supplier') {
    const supplier = await Supplier.findOne({
      $or: [
        { user: user._id },
        { email: user.email },
      ],
    });

    if (supplier) {
      supplier.user = supplier.user || user._id;
      supplier.email = user.email;
      supplier.phone = user.phone || supplier.phone;
      supplier.contact = user.phone || user.email;
      if (user.name) {
        supplier.name = supplier.name || user.name;
        supplier.companyName = supplier.companyName || user.name;
      }
      if (user.category) {
        const categories = new Set([user.category, ...(supplier.categories || [])].filter(Boolean));
        supplier.categories = [...categories];
      }
      await supplier.save();
    }
  }

  publishCrudEvent('users', 'updated', { userId: String(user._id), role: user.role }, {
    roles: ['admin'],
    userIds: [user._id],
  });

  return res.json({ user: formatUser(user) });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  user.password = newPassword;
  await user.save();

  publishCrudEvent('users', 'password-updated', { userId: String(user._id), role: user.role }, {
    userIds: [user._id],
  });

  return res.json({ message: 'Mot de passe mis à jour' });
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

export { register, login, getMe, updateMe, changePassword };
