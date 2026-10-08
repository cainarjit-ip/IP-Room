import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Health check endpoints for Cloud Run probes and uptime monitors
app.get(['/healthz', '/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static assets built by Vite and public directory
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: return index.html for all client-side navigation routes
app.get('*', (_req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('<!DOCTYPE html><html><head><title>IP Room</title></head><body><div id="root"></div></body></html>');
    }
  });
});

const servers = [];

function listenOnPort(p) {
  try {
    const s = app.listen(p, '0.0.0.0', () => {
      console.log(`Server listening on 0.0.0.0:${p}`);
    });
    s.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${p} is already in use (e.g. reverse proxy active), continuing.`);
      } else {
        console.error(`Error on port ${p}:`, err.message);
      }
    });
    servers.push(s);
  } catch (err) {
    console.error(`Failed to listen on port ${p}:`, err.message);
  }
}

// 1. Always bind to port 3000 (used by Nginx internal reverse proxy and dev container)
listenOnPort(3000);

// 2. If Cloud Run provides a target PORT (typically 8080) and it differs from 3000, also bind to it
const targetPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
if (targetPort !== 3000) {
  listenOnPort(targetPort);
}

const shutdown = () => {
  console.log('Shutdown signal received: closing HTTP servers');
  servers.forEach(s => s.close());
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
