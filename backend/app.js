import './config/env.js';

import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '30mb' }));
app.use(requestLogger);

app.get('/', (_req, res) => {
  res.json({
    name: 'ArchiPrice API',
    docs: 'Voir README — les routes sont sous /api',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/register | /api/auth/login | /api/auth/me',
      supplierOnboarding: '/api/auth/register (accountType=supplier)',
      supplierWorkspace: '/api/supplier/workspace',
      projects: '/api/projects',
      products: '/api/projects/:projectId/products',
    },
  });
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
