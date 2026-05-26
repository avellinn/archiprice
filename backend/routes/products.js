import express from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImageByPublicId,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import requireDb from '../middleware/requireDb.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router({ mergeParams: true });

router.use(requireDb);
router.use(protect);

router.get('/', asyncHandler(getProducts));
router.post('/', asyncHandler(createProduct));
router.put('/:id', asyncHandler(updateProduct));
router.delete('/:id', asyncHandler(deleteProduct));
router.delete('/:id/images', asyncHandler(deleteProductImageByPublicId));

export default router;
