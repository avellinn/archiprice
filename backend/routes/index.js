const express = require('express');
const healthRouter = require('./health');
const authRouter = require('./auth');
const projectsRouter = require('./projects');
const productsRouter = require('./products');
const adminRouter = require('./admin');

const router = express.Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/projects', projectsRouter);
router.use('/projects/:projectId/products', productsRouter);
router.use('/admin', adminRouter);

module.exports = router;
