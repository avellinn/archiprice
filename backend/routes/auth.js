import express from 'express';
import {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.use(requireDb);

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.get('/me', protect, asyncHandler(getMe));
router.patch('/me', protect, asyncHandler(updateMe));
router.patch('/me/password', protect, asyncHandler(changePassword));

export default router;
