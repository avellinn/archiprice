require('./config/env');

const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);

app.get('/', (_req, res) => {
  res.json({
    name: 'ArchiPrice API',
    docs: 'Voir README — les routes sont sous /api',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/register | /api/auth/login | /api/auth/me',
      projects: '/api/projects',
      products: '/api/projects/:projectId/products',
    },
  });
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
