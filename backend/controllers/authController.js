const User = require('../models/User');
const generateToken = require('../utils/generateToken');

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function sendAuthResponse(res, user, statusCode = 200) {
  const token = generateToken(user._id, user.role);
  res.status(statusCode).json({
    token,
    user: formatUser(user),
  });
}

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const user = await User.create({
    name: name?.trim() || undefined,
    email,
    password,
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

  sendAuthResponse(res, user);
}

async function getMe(req, res) {
  res.json({ user: formatUser(req.user) });
}

module.exports = { register, login, getMe };
