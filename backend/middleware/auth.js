import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Supplier from '../models/Supplier.js';

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
  return async (req, res, next) => {
    // protect a déjà placé req.user
    const userRole = String(req.user?.role || '').toLowerCase();
    if (userRole !== role) {
      res.status(403).json({ error: `Accès réservé aux ${role}s` });
      return;
    }

    if (role === 'supplier') {
      try {
        const supplier = await Supplier.findOne({ user: req.user._id });

        if (!supplier) {
          // Don't create supplier profiles automatically in production.
          // In development only, create a minimal profile to ease local testing.
          if (process.env.NODE_ENV === 'development') {
            const minimal = {
              user: req.user._id,
              email: req.user.email || '',
              // Ensure required `name` is set when possible to avoid validation errors
              name: req.user.name || req.user.email || 'Fournisseur',
              companyName: req.user.name || req.user.email || 'Boutique',
              contact: req.user.phone || req.user.email || '',
              phone: req.user.phone || '',
              status: 'Actif',
            };
            await Supplier.create(minimal);
          } else {
            res.status(403).json({ error: 'Profil fournisseur introuvable — accès supplier interdit' });
            return;
          }
        }

        if (supplier && supplier.status === 'Supprimé') {
          res.status(403).json({ error: 'Profil fournisseur introuvable — accès supplier interdit' });
          return;
        }
      } catch (err) {
        // If DB operations fail, return server error
        res.status(500).json({ error: 'Vérification fournisseur impossible' });
        return;
      }
    }

    next();
  };
}

// Middlewares spécifiques pour chaque rôle
const requireAdmin = requireRole('admin');
const requireSupplier = requireRole('supplier');

export { protect, requireAdmin, requireSupplier };
