/* global process */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(frontendDir, '..');
const backendPort = Number(process.env.PORT || 5000);

let backendProcess = null;
let viteProcess = null;
let isShuttingDown = false;

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

function waitForPort(port, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    async function retry() {
      if (await isPortOpen(port)) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Backend indisponible sur le port ${port}`));
        return;
      }

      setTimeout(retry, 500);
    }

    retry();
  });
}

function spawnCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  child.on('error', (error) => {
    console.error(`[dev] Impossible de lancer ${command}: ${error.message}`);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill('SIGTERM');
  }

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }

  process.exit(exitCode);
}

async function start() {
  const backendAlreadyRunning = await isPortOpen(backendPort);

  if (backendAlreadyRunning) {
    console.log(`[dev] API déjà disponible sur http://localhost:${backendPort}`);
  } else {
    console.log(`[dev] API absente sur http://localhost:${backendPort} — démarrage du backend...`);
    backendProcess = spawnCommand('npm', ['run', 'dev', '--prefix', 'backend'], {
      cwd: projectRoot,
    });
    await waitForPort(backendPort);
    console.log(`[dev] API disponible sur http://localhost:${backendPort}`);
  }

  viteProcess = spawnCommand('npx', ['vite'], {
    cwd: frontendDir,
  });

  viteProcess.on('exit', (code) => {
    shutdown(code || 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start().catch((error) => {
  console.error(`[dev] ${error.message}`);
  shutdown(1);
});
