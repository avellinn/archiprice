const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] API ArchiPrice → http://localhost:${PORT}`);
    console.log(`[server] Health       → http://localhost:${PORT}/api/health`);
  });
}

start();
