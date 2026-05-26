import jwt from 'jsonwebtoken';
import User from '../models/User.js';

async function protect(req, res, next) {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
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

    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
function requireAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  const type = String(req.user?.type || '').toLowerCase();

  if (req.user && (role === 'admin' || type === 'admin')) {
    next(); // utilisateur admin → on continue
  } else {
    res.status(403).json({ error: 'Accès réservé aux BackOffice' });
  }
}

export { protect, requireAdmin };
