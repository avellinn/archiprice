require('./config/env');

const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
