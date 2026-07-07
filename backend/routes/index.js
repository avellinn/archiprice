import express from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import projectsRouter from './projects.js';
import productsRouter from './products.js';
import adminRouter from './admin.js';
import catalogueConfigRouter from './catalogueConfig.js';
import uploadsRouter from './uploads.js';
import supplierRouter from './supplier.js';
import realtimeRouter from './realtime.js';
import supportItemsRouter from './supportItems.js';
import demandesRouter from './demandes.js';
import simulationsRouter from './simulations.js';
import simulationExportsRouter from './simulationExports.js';

const router = express.Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use(catalogueConfigRouter);
router.use(uploadsRouter);
router.use(realtimeRouter);
router.use('/projects', projectsRouter);
router.use('/projects/:projectId/products', productsRouter);
router.use('/admin', adminRouter);
router.use('/supplier', supplierRouter);
router.use('/support-items', supportItemsRouter);
router.use('/demandes', demandesRouter);
router.use('/simulations', simulationsRouter);
router.use('/simulation-exports', simulationExportsRouter);

export default router;
