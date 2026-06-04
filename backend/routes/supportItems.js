import express from 'express';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import SupportItem from '../models/SupportItem.js';
import { publishCrudEvent } from '../services/realtimeService.js';

const router = express.Router();

function formatDocument(document) {
  const value = typeof document.toObject === 'function' ? document.toObject() : document;
  return {
    ...value,
    id: String(value._id || value.id),
    _id: undefined,
    __v: undefined,
  };
}

router.use(requireDb);
router.use(protect);

router.get('/me', async (req, res) => {
  const supportItems = await SupportItem.find({ userId: req.user._id }).sort({ updatedAt: -1, createdAt: -1 });
  return res.json({ supportItems: supportItems.map(formatDocument) });
});

router.post('/', async (req, res) => {
  const supportItem = await SupportItem.create({
    tab: 'feedback',
    type: req.body.type || 'Feedback',
    status: 'Ouvert',
    subject: req.body.subject,
    description: req.body.description,
    date: req.body.date,
    user: req.user.name || req.user.email,
    email: req.user.email,
    userId: req.user._id,
    sourceRole: req.user.role === 'supplier' ? 'supplier' : 'user',
    reply: '',
  });

  publishCrudEvent('support-items', 'created', { supportItemId: String(supportItem._id) }, { roles: ['admin'] });
  return res.status(201).json({ supportItem: formatDocument(supportItem) });
});

export default router;
