const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireDb);

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', protect, asyncHandler(getMe));

module.exports = router;
