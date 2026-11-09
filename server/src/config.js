import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, 'data');

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'AOS Multi-Service International',
  },
  // Dossier de données persistantes (base + images). Sur Render : pointer DATA_DIR vers le disque monté.
  dataDir: DATA_DIR,
  dbFile: path.join(DATA_DIR, 'aos.db'),
  uploadsDir: path.join(DATA_DIR, 'uploads'),
  logsDir: path.join(DATA_DIR, 'logs'),
  logoPath: path.join(ROOT_DIR, 'server', 'logo.jpg'),
  clientDist: path.join(ROOT_DIR, 'client', 'dist'),
};

if (config.isProd && config.jwtSecret === 'dev-secret-change-me') {
  console.warn('⚠️  JWT_SECRET non défini : définissez-le dans .env en production.');
}
