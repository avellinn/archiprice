const express = require('express');
const healthRouter = require('./health');
const authRouter = require('./auth');
const projectsRouter = require('./projects');

const router = express.Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/projects', projectsRouter);

module.exports = router;
