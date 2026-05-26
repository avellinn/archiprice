import express from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import projectsRouter from './projects.js';
import productsRouter from './products.js';
import adminRouter from './admin.js';
import catalogueConfigRouter from './catalogueConfig.js';
import uploadsRouter from './uploads.js';

const router = express.Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use(catalogueConfigRouter);
router.use(uploadsRouter);
router.use('/projects', projectsRouter);
router.use('/projects/:projectId/products', productsRouter);
router.use('/admin', adminRouter);

export default router;
