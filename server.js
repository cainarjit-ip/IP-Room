import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Health check endpoints for Cloud Run probes and uptime monitors
app.get(['/healthz', '/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Explicit XML Sitemap route for Google Search Console & SEO crawlers
app.get('/sitemap.xml', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.iky.com.np';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const domain = `${proto}://${host}`;

  try {
    const sitemapDist = path.join(__dirname, 'dist', 'sitemap.xml');
    const sitemapPublic = path.join(__dirname, 'public', 'sitemap.xml');
    const filePath = fs.existsSync(sitemapDist) ? sitemapDist : sitemapPublic;

    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      if (!host.includes('iky.com.np')) {
        content = content.replace(/https:\/\/www\.iky\.com\.np/g, domain);
      }
      res.header('Content-Type', 'application/xml; charset=utf-8');
      return res.status(200).send(content);
    }
  } catch (err) {
    console.error('Error serving sitemap.xml:', err);
  }

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${domain}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url></urlset>`);
});

// Explicit robots.txt route
app.get('/robots.txt', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.iky.com.np';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const domain = `${proto}://${host}`;
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(`User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`);
});

// Serve static assets built by Vite and public directory
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: return index.html for all client-side navigation routes
app.get('*', (_req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('<!DOCTYPE html><html><head><title>IP ROOM Rent | Nepal\'s Student & Renter Room Marketplace</title></head><body><div id="root"></div></body></html>');
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

const targetPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
if (targetPort && targetPort !== 3000 && !isNaN(targetPort)) {
  listenOnPort(targetPort);
}

// Keep process alive indefinitely in container
setInterval(() => {}, 1000 * 60 * 60);

const shutdown = () => {
  console.log('Shutdown signal received: closing HTTP servers');
  servers.forEach(s => {
    try {
      s.close();
    } catch {}
  });
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
