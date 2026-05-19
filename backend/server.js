const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const healthRouter = require('./routes/health');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api', healthRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] API ArchiPrice sur http://localhost:${PORT}`);
    console.log(`[server] Health check : http://localhost:${PORT}/api/health`);
  });
}

start();
