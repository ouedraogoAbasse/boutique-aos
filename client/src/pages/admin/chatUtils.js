import { parseDate } from '../../lib/utils.js';
export const p2 = (n) => String(n).padStart(2, '0');
export const jourCle = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export function labelJour(d) {
  const t = new Date(); const h = new Date(); h.setDate(t.getDate() - 1);
  if (jourCle(d) === jourCle(t)) return "Aujourd'hui";
  if (jourCle(d) === jourCle(h)) return 'Hier';
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
export { parseDate };
