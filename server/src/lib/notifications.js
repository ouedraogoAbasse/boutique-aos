import { execute, query } from '../db.js';

/** creerNotification() PHP */
export async function creerNotification(adminId, type, titre, message, lien = null, importance = 'medium') {
  try {
    await execute(
      'INSERT INTO notifications (admin_id, type, titre, message, lien, importance) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, type, titre, message, lien, importance]
    );
  } catch (e) {
    console.error('creerNotification:', e.message);
  }
}

/** Notifie le vendeur concerné + tous les super admins (sans doublon) */
export async function notifierVendeurEtSuperAdmins(adminId, type, titre, message, lien = null, importance = 'medium') {
  const supers = await query("SELECT id FROM admins WHERE role = 'super_admin'");
  const ids = new Set(supers.map((s) => s.id));
  if (adminId) ids.add(adminId);
  for (const id of ids) await creerNotification(id, type, titre, message, lien, importance);
}
