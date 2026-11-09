// npm run db:init → crée la base SQLite (facultatif : le serveur le fait seul au démarrage)
import { ensureSchema, db } from '../db.js';
await ensureSchema();
console.log('✅ Base prête.');
db.close();
