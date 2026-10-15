import express from 'express';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { config } from './config.js';
import { logger } from './util/logger.js';
import { KitchenRoom } from './rooms/KitchenRoom.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && config.CORS_ORIGINS.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    // 32 KB maxPayload so WebRTC SDP offers/answers (2.5–6 KB) never trigger 1009 disconnect
    maxPayload: 32 * 1024,
  }),
});

gameServer.define('kitchen', KitchenRoom);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidateDists = [
  path.resolve(process.cwd(), config.CLIENT_DIST),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'apps/client/dist'),
];
const clientDist = candidateDists.find(p => fs.existsSync(p));

if (clientDist) {
  logger.info(`Serving static client from ${clientDist}`);
  app.use(
    express.static(clientDist, {
      setHeaders(res, filePath) {
        if (/\.(glb|gltf|png|jpg|jpeg|webp|mp3|ogg|wav|woff2?)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    })
  );
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/healthz') && !req.path.startsWith('/matchmake')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    } else {
      res.status(404).end();
    }
  });
}

gameServer.listen(config.PORT).then(() => {
  logger.info(`Server listening on ws://localhost:${config.PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  gameServer.gracefullyShutdown();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  gameServer.gracefullyShutdown();
});
