import cluster from 'node:cluster';
import os from 'node:os';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import auth from './routes/auth.js';
import products from './routes/products.js';
import orders from './routes/orders.js';
import reviewsRouter from './routes/reviews.js';
import contactRouter from './routes/contact.js';

const PORT = Number(process.env.PORT || 5000);
const CPU_COUNT = Math.max(1, os.availableParallelism?.() || os.cpus().length || 1);
const CLUSTER_WORKERS = Number(process.env.CLUSTER_WORKERS || CPU_COUNT);
const ENABLE_CLUSTER = process.env.ENABLE_CLUSTER !== 'false';

function buildAllowedOrigins() {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return [
    'https://elite-vault.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
}

function createApp() {
  const app = express();
  const allowedOrigins = buildAllowedOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Blocked by CORS policy'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadsDir = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '7d',
      immutable: true,
    })
  );

  app.use('/auth', auth);
  app.use('/products', products);
  app.use('/orders', orders);
  app.use('/reviews', reviewsRouter);
  app.use('/contact', contactRouter);

  app.get('/', (_req, res) => {
    res.send('Welcome to the EliteVault API');
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, pid: process.pid });
  });

  return app;
}

function startWorker() {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} listening on port ${PORT}`);
  });
}

if (ENABLE_CLUSTER && cluster.isPrimary) {
  const workerCount = Math.max(1, Math.min(CLUSTER_WORKERS, CPU_COUNT));
  console.log(`Primary ${process.pid} starting ${workerCount} workers on port ${PORT}`);

  for (let i = 0; i < workerCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} died (code=${code}, signal=${signal}). Restarting...`);
    cluster.fork();
  });
} else {
  startWorker();
}
