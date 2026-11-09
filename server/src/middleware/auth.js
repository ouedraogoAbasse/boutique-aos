import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { queryOne } from '../db.js';
import { HttpError, asyncHandler } from '../lib/helpers.js';

export const USER_COOKIE = 'aos_user';   // session client  (= $_SESSION['user_id'])
export const ADMIN_COOKIE = 'aos_admin'; // session admin   (= $_SESSION['admin_id'])
const MAX_AGE = 7 * 24 * 3600 * 1000;

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  maxAge: MAX_AGE,
  path: '/',
});

export function signSession(res, cookieName, id) {
  const token = jwt.sign({ id }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(cookieName, token, cookieOpts());
}
export function clearSession(res, cookieName) {
  res.clearCookie(cookieName, { path: '/' });
}
function readId(req, cookieName) {
  const token = req.cookies?.[cookieName];
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret).id;
  } catch {
    return null;
  }
}

/** Retire les champs sensibles avant envoi au client */
export const publicUser = (u) => {
  if (!u) return null;
  const { mot_de_passe, ...rest } = u;
  return rest;
};
export const publicAdmin = publicUser;

/** Charge req.user (client) si cookie valide — ne bloque pas */
export const loadUser = asyncHandler(async (req, _res, next) => {
  const id = readId(req, USER_COOKIE);
  req.user = id ? await queryOne('SELECT * FROM utilisateurs WHERE id = ?', [id]) : null;
  next();
});
/** Charge req.admin (+ req.isSuperAdmin) si cookie valide — ne bloque pas */
export const loadAdmin = asyncHandler(async (req, _res, next) => {
  const id = readId(req, ADMIN_COOKIE);
  req.admin = id ? await queryOne('SELECT * FROM admins WHERE id = ?', [id]) : null;
  req.isSuperAdmin = !!req.admin && req.admin.role === 'super_admin';
  next();
});

/** estConnecte() : 401 si pas de client connecté (ou compte bloqué) */
export const requireUser = [
  loadUser,
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Veuillez vous connecter.', { code: 'AUTH_REQUIRED' }));
    if (req.user.statut === 'bloqué') return next(new HttpError(403, 'Votre compte est bloqué.', { code: 'BLOCKED' }));
    next();
  },
];
/** estAdminConnecte() : 401 si pas d'admin connecté */
export const requireAdmin = [
  loadAdmin,
  (req, _res, next) => {
    if (!req.admin) return next(new HttpError(401, 'Veuillez vous connecter.', { code: 'AUTH_REQUIRED' }));
    next();
  },
];
/** estSuperAdmin() : 403 sinon (à placer après requireAdmin) */
export const requireSuperAdmin = (req, _res, next) => {
  if (!req.isSuperAdmin) return next(new HttpError(403, 'Accès réservé au super administrateur.', { code: 'FORBIDDEN' }));
  next();
};
/** Réservé aux vendeurs (ex: commissions.php redirige le super admin) */
export const requireVendeur = (req, _res, next) => {
  if (req.isSuperAdmin) return next(new HttpError(403, 'Page réservée aux vendeurs.', { code: 'FORBIDDEN' }));
  next();
};
