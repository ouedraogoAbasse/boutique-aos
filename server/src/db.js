// Base de données SQLite intégrée à Node.js.
// Aucun pilote SQLite externe n'est nécessaire.

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { config, ROOT_DIR } from './config.js';

// Création du dossier de données s'il n'existe pas.
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

// Connexion à la base de données.
export const db = new DatabaseSync(config.dbFile);

// Configuration SQLite.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA foreign_keys = OFF');

// Conversion des paramètres JavaScript vers SQLite.
const bind = (params) =>
  params.map((p) =>
    p === undefined ? null :
    typeof p === 'boolean' ? Number(p) :
    p
  );

const stmt = (sql) => db.prepare(sql);

// Exécution interne des requêtes SQL.
function run(sql, params = []) {
  const s = stmt(sql);

  // Une requête qui retourne des colonnes (SELECT, RETURNING, etc.).
  if (s.columns().length > 0) {
    return s.all(...bind(params));
  }

  // INSERT, UPDATE, DELETE, etc.
  const r = s.run(...bind(params));

  return {
    insertId: Number(r.lastInsertRowid),
    affectedRows: Number(r.changes),
  };
}

/** SELECT -> tableau de lignes */
export async function query(sql, params = []) {
  const r = run(sql, params);
  return Array.isArray(r) ? r : [];
}

/** SELECT -> première ligne ou null */
export async function queryOne(sql, params = []) {
  return (await query(sql, params))[0] ?? null;
}

/** SELECT COUNT/SUM -> première colonne de la première ligne */
export async function scalar(sql, params = [], fallback = 0) {
  const rows = await query(sql, params);

  if (!rows[0]) return fallback;

  const v = Object.values(rows[0])[0];

  return v === null || v === undefined ? fallback : v;
}

/** INSERT/UPDATE/DELETE -> { insertId, affectedRows } */
export async function execute(sql, params = []) {
  const r = run(sql, params);

  return Array.isArray(r)
    ? { insertId: 0, affectedRows: 0 }
    : r;
}

/**
 * Transaction SQLite.
 */
export async function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');

  const tx = {
    query,
    queryOne,
    execute,
  };

  try {
    const result = await fn(tx);

    db.exec('COMMIT');

    return result;
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // La transaction a peut-être déjà été annulée.
    }

    throw e;
  }
}

/**
 * Création des tables et du super administrateur initial
 * si aucun administrateur n'existe.
 */
export async function ensureSchema() {
  const schemaPath = path.join(ROOT_DIR, 'database', 'schema.sql');

  db.exec(fs.readFileSync(schemaPath, 'utf8'));

  if (!(await scalar('SELECT COUNT(*) FROM admins'))) {
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangezMoi123!';

    await execute(
      `INSERT INTO admins
        (nom, email, mot_de_passe, role, boutique, commission)
       VALUES (?, ?, ?, 'super_admin', 'AOS Multi-Service', 0)`,
      [
        process.env.SUPER_ADMIN_NAME || 'Administrateur',
        email,
        bcrypt.hashSync(password, 10),
      ]
    );

    console.log(`✅ Base initialisée — super admin créé : ${email}`);

    if (!process.env.SUPER_ADMIN_PASSWORD) {
      console.warn(
        '⚠️ SUPER_ADMIN_PASSWORD non défini : mot de passe par défaut utilisé, changez-le.'
      );
    }
  }
}