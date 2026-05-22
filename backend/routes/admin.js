const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

function formatAdminUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.use(protect);
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users.map(formatAdminUser));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(formatAdminUser(user));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(formatAdminUser(user));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


router.get('/test', (req, res) => {
  res.json({ message: 'Backoffice Archiprice opérationnel' });
});

module.exports = router;
