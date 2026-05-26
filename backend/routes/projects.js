import express from 'express';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { downloadProjectRecapPdf } from '../controllers/recapController.js';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.use(requireDb);
router.use(protect);

router.get('/', asyncHandler(getProjects));
router.post('/', asyncHandler(createProject));
router.get('/:id/recap.pdf', asyncHandler(downloadProjectRecapPdf));
router.put('/:id', asyncHandler(updateProject));
router.delete('/:id', asyncHandler(deleteProject));

export default router;
