// Base de données SQLite intégrée au projet (un simple fichier, comme Django).
// Aucun serveur de base de données à installer ni à louer.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config, ROOT_DIR } from './config.js';

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
export const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = OFF');

// Les paramètres JS -> SQLite (undefined -> NULL, booléens -> 0/1)
const bind = (params) => params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p));
const stmt = (sql) => db.prepare(sql);

function run(sql, params = []) {
  const s = stmt(sql);
  if (s.reader) return s.all(...bind(params));
  const r = s.run(...bind(params));
  return { insertId: Number(r.lastInsertRowid), affectedRows: r.changes };
}

/** SELECT -> tableau de lignes */
export async function query(sql, params = []) { const r = run(sql, params); return Array.isArray(r) ? r : []; }
/** SELECT -> première ligne ou null */
export async function queryOne(sql, params = []) { return (await query(sql, params))[0] ?? null; }
/** SELECT COUNT/SUM -> première colonne de la première ligne */
export async function scalar(sql, params = [], fallback = 0) {
  const rows = await query(sql, params);
  if (!rows[0]) return fallback;
  const v = Object.values(rows[0])[0];
  return v === null || v === undefined ? fallback : v;
}
/** INSERT/UPDATE/DELETE -> { insertId, affectedRows } */
export async function execute(sql, params = []) { const r = run(sql, params); return Array.isArray(r) ? { insertId: 0, affectedRows: 0 } : r; }

/**
 * Transaction. Le pilote étant synchrone, aucune autre requête ne peut s'intercaler
 * tant que fn n'attend que les fonctions de ce module (les promesses se résolvent en microtâche).
 */
export async function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  const tx = { query, queryOne, execute };
  try {
    const result = await fn(tx);
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* déjà annulée */ }
    throw e;
  }
}

/** Crée les tables (idempotent) et le super admin initial si aucun admin n'existe. */
export async function ensureSchema() {
  db.exec(fs.readFileSync(path.join(ROOT_DIR, 'database', 'schema.sql'), 'utf8'));
  if (!(await scalar('SELECT COUNT(*) FROM admins'))) {
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangezMoi123!';
    await execute("INSERT INTO admins (nom, email, mot_de_passe, role, boutique, commission) VALUES (?, ?, ?, 'super_admin', 'AOS Multi-Service', 0)",
      [process.env.SUPER_ADMIN_NAME || 'Administrateur', email, bcrypt.hashSync(password, 10)]);
    console.log(`✅ Base initialisée — super admin créé : ${email}`);
    if (!process.env.SUPER_ADMIN_PASSWORD) console.warn('⚠️  SUPER_ADMIN_PASSWORD non défini : mot de passe par défaut utilisé, changez-le.');
  }
}
