export const GOALS = {
  perte: { label: 'Perdre du poids', short: 'Perte de poids', delta: -400, reps: 12, fin: 6, protein: 2.0, desc: 'cardio en fin de séance' },
  maintien: { label: 'Maintenir', short: 'Maintien', delta: 0, reps: 10, fin: 0, protein: 1.8, desc: 'programme équilibré' },
  prise: { label: 'Prendre du poids', short: 'Prise de masse', delta: 300, reps: 8, fin: 0, protein: 1.8, desc: 'plus lourd, sans cardio' },
};
export const GOAL_KEYS = ['perte', 'maintien', 'prise'];

// Activité HORS sport : le sport est compté à part, séance par séance.
export const ACTIVITY_LEVELS = [
  { v: 1.2, label: 'Sédentaire', sub: 'Travail de bureau, peu de marche' },
  { v: 1.375, label: 'Légère', sub: 'Debout ou en mouvement une partie de la journée' },
  { v: 1.55, label: 'Active', sub: 'Métier physique' },
];

export const MEALS = [
  { id: 'petitdej', label: 'Petit-déjeuner', short: 'Petit-déj', prep: 'au petit-déjeuner' },
  { id: 'dejeuner', label: 'Déjeuner', short: 'Déjeuner', prep: 'au déjeuner' },
  { id: 'collation', label: 'Collation', short: 'Collation', prep: 'à la collation' },
  { id: 'diner', label: 'Dîner', short: 'Dîner', prep: 'au dîner' },
];

export function mealForNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'petitdej';
  if (h < 14.5) return 'dejeuner';
  if (h < 18) return 'collation';
  return 'diner';
}

// Mifflin-St Jeor
export function bmr(p) {
  return 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
}

export function targetFor(p) {
  if (!p) return 2000;
  const floor = p.sex === 'f' ? 1200 : 1500;
  const t = bmr(p) * p.activity + GOALS[p.goal].delta;
  return Math.max(floor, Math.round(t / 10) * 10);
}

export function macroTargets(p) {
  const kcal = targetFor(p);
  const prot = Math.round(p.weight * GOALS[p.goal].protein);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
  return { p: prot, c: carbs, f: fat };
}

export const kcalOf = i => Math.round(((i.g || 0) * (i.k100 || 0)) / 100);
export const macroOf = (i, k) => ((i.g || 0) * (i[k + '100'] || 0)) / 100;

export function dayTotals(day) {
  const e = day.entries || [];
  const a = day.activities || [];
  const sum = f => e.reduce((s, i) => s + f(i), 0);
  return {
    eaten: Math.round(sum(kcalOf)),
    p: Math.round(sum(i => macroOf(i, 'p'))),
    c: Math.round(sum(i => macroOf(i, 'c'))),
    f: Math.round(sum(i => macroOf(i, 'f'))),
    burned: Math.round(a.reduce((s, x) => s + (x.kcal || 0), 0)),
    hasFood: e.length > 0,
  };
}
