import jwt from 'jsonwebtoken';
import User from '../models/User.js';

async function protect(req, res, next) {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Non autorisé — token manquant' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    if (req.user.status !== 'Actif') {
      return res.status(403).json({
        error: req.user.status === 'Bloqué'
          ? 'Compte bloqué — accès API interdit'
          : 'Compte désactivé — accès API interdit',
      });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Fonction générique pour vérifier un rôle
function requireRole(role) {
  return (req, res, next) => {
    // protect a déjà placé req.user
    const userRole = String(req.user?.role || '').toLowerCase();
    if (userRole === role) {
      next();
    } else {
      res.status(403).json({ error: `Accès réservé aux ${role}s` });
    }
  };
}

// Middlewares spécifiques pour chaque rôle
const requireAdmin = requireRole('admin');
const requireSupplier = requireRole('supplier');

export { protect, requireAdmin, requireSupplier };
