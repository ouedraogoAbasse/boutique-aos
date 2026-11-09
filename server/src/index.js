import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { HttpError } from './lib/helpers.js';

import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import messagingRoutes from './routes/messaging.js';
import adminRoutes from './routes/admin/index.js';

const app = express();
app.set('trust proxy', 1); // derrière le proxy de Render
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

fs.mkdirSync(config.uploadsDir, { recursive: true });
fs.mkdirSync(config.logsDir, { recursive: true });
// Les uploads sont des images uniquement (équivalent du .htaccess de uploads/)
app.use('/uploads', express.static(config.uploadsDir, { fallthrough: true, index: false, dotfiles: 'deny' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);      // /home /categories /produits /livreurs
app.use('/api/panier', cartRoutes);
app.use('/api', orderRoutes);        // /commander/prepare /commandes ...
app.use('/api/conversations', messagingRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Route introuvable.')));

// Production : sert le front React (SPA)
if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

// Gestion d'erreurs centralisée
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: "L'image est trop volumineuse (max 5 Mo)." });
  if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cette valeur existe déjà (doublon).' });
  console.error(err);
  res.status(500).json({ error: config.isProd ? 'Erreur interne du serveur.' : err.message });
});

ensureSchema()
  .catch((e) => console.error('ensureSchema:', e.message))
  .finally(() => {
    app.listen(config.port, () => console.log(`✅ API AOS démarrée sur http://localhost:${config.port}`));
  });

export default app;
