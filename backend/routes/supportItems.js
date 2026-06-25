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
    userId: req.user._id,
    sourceRole: req.user.role === 'supplier' ? 'supplier' : 'user',
    reply: '',
    messages: [{
      sender: req.user._id,
      senderRole: req.user.role === 'supplier' ? 'supplier' : 'user',
      senderName: req.user.name || req.user.email,
      message: req.body.description,
    }],
  });

  publishCrudEvent('support-items', 'created', { supportItemId: String(supportItem._id) }, { roles: ['admin'] });
  return res.status(201).json({ supportItem: formatDocument(supportItem) });
});

router.post('/:id/messages', async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Réponse requise' });
  const supportItem = await SupportItem.findOne({ _id: req.params.id, userId: req.user._id });
  if (!supportItem) return res.status(404).json({ error: 'Conversation support introuvable' });

  supportItem.messages.push({
    sender: req.user._id,
    senderRole: req.user.role === 'supplier' ? 'supplier' : 'user',
    senderName: req.user.name || req.user.email,
    message,
  });
  supportItem.status = 'En cours';
  supportItem.unreadForAdmin += 1;
  await supportItem.save();
  publishCrudEvent('support-items', 'message-created', { supportItemId: String(supportItem._id) }, {
    roles: ['admin'], userIds: [req.user._id],
  });
  return res.status(201).json({ supportItem: formatDocument(supportItem) });
});

router.patch('/:id/read', async (req, res) => {
  const supportItem = await SupportItem.findOne({ _id: req.params.id, userId: req.user._id });
  if (!supportItem) return res.status(404).json({ error: 'Conversation support introuvable' });
  supportItem.unreadForOwner = 0;
  await supportItem.save();
  publishCrudEvent('support-items', 'read', { supportItemId: String(supportItem._id) }, {
    userIds: [req.user._id],
  });
  return res.json({ success: true });
});

export default router;
