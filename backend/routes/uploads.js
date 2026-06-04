import express from 'express';
import { deleteImage, uploadImages } from '../controllers/uploadController.js';
import { MAX_IMAGE_COUNT, handleMulterError, upload } from '../middleware/multerUpload.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.post(
  '/uploads/products/images',
  upload.array('image', MAX_IMAGE_COUNT),
  handleMulterError,
  asyncHandler(uploadImages),
);

router.delete(
  '/uploads/products/images',
  asyncHandler(deleteImage),
);

export default router;
