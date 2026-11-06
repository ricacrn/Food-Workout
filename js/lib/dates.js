// Dates locales au format AAAA-MM-JJ (le fuseau du téléphone fait foi).
export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LETTER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const keyOf = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayKey = () => keyOf(new Date());
export const fromKey = k => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k, n) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
// 0 = lundi … 6 = dimanche
export const weekday = k => (fromKey(k).getDay() + 6) % 7;
export const dayNum = k => fromKey(k).getDate();
export const longLabel = k => `${DAY_NAMES[weekday(k)]} ${dayNum(k)} ${MONTHS[fromKey(k).getMonth()]}`;
export const mondayOf = k => addDays(k, -weekday(k));
export const hhmm = (d = new Date()) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

export function relativeDay(k, ref = todayKey()) {
  if (k === ref) return 'Aujourd’hui';
  if (k === addDays(ref, 1)) return 'Demain';
  if (k === addDays(ref, -1)) return 'Hier';
  const diff = (fromKey(k) - fromKey(ref)) / 86400000;
  if (diff > 0 && diff < 7) return DAY_NAMES[weekday(k)];
  return longLabel(k);
}
