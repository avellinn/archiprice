import express from 'express';
import { deleteImage, uploadImages } from '../controllers/uploadController.js';
import { handleMulterError, upload } from '../middleware/multerUpload.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.post(
  '/uploads/products/images',
  upload.array('image', 12),
  handleMulterError,
  asyncHandler(uploadImages),
);

router.delete(
  '/uploads/products/images',
  asyncHandler(deleteImage),
);

export default router;
