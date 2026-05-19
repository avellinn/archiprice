const express = require('express');
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireDb);
router.use(protect);

router.get('/', asyncHandler(getProjects));
router.post('/', asyncHandler(createProject));
router.put('/:id', asyncHandler(updateProject));
router.delete('/:id', asyncHandler(deleteProject));

module.exports = router;
