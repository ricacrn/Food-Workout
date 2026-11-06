import { GOALS, targetFor, dayTotals } from './nutrition.js';
import { addDays, weekday, todayKey } from './dates.js';
import { getDay } from './store.js';

export const WARM = 6; // minutes d'échauffement
export const STEP_KCAL = 250; // écart qui déclenche un palier
export const STEP_PCT = 5; // % par palier
export const MAX_STEPS = 4; // ±20 %

// Programme tournant : chaque séance reprend la suivante de la liste, sur tes jours d'entraînement.
// kg = charge de départ suggérée, modifiable pendant la séance (elle est ensuite retenue).
export const SESSIONS = [
  { id: 'lower', name: 'Bas du corps', ex: [{ n: 'Squat', s: 4, kg: 40 }, { n: 'Fentes bulgares', s: 3, kg: 10 }, { n: 'Soulevé de terre roumain', s: 3, kg: 40 }, { n: 'Gainage', s: 3, sec: 45 }] },
  { id: 'push', name: 'Haut du corps · Poussée', ex: [{ n: 'Développé couché', s: 4, kg: 40 }, { n: 'Développé militaire haltères', s: 3, kg: 12 }, { n: 'Dips', s: 3 }, { n: 'Extensions triceps', s: 3, kg: 15 }] },
  { id: 'pull', name: 'Haut du corps · Tirage', ex: [{ n: 'Tractions', s: 4 }, { n: 'Rowing barre', s: 3, kg: 35 }, { n: 'Face pull', s: 3, kg: 15 }, { n: 'Curl biceps', s: 3, kg: 10 }] },
  { id: 'full', name: 'Full body', ex: [{ n: 'Soulevé de terre', s: 4, kg: 60 }, { n: 'Pompes', s: 3 }, { n: 'Goblet squat', s: 3, kg: 16 }, { n: 'Gainage latéral', s: 3, sec: 30 }] },
];

// Activités hors programme (valeurs MET du Compendium of Physical Activities).
export const ACTIVITIES = [
  { id: 'tennis', label: 'Tennis', met: 7.3 },
  { id: 'renfo', label: 'Body Pump / renfo', met: 6 },
  { id: 'course', label: 'Course à pied', met: 9.8 },
  { id: 'velo', label: 'Vélo', met: 7.5 },
  { id: 'marche', label: 'Marche', met: 3.5 },
  { id: 'natation', label: 'Natation', met: 7 },
  { id: 'muscu', label: 'Musculation libre', met: 5 },
  { id: 'autre', label: 'Autre', met: 5 },
];

export const metKcal = (met, kg, minutes) => Math.round((met * kg * minutes) / 60);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Bilan des 3 derniers jours (avant-hier, hier, aujourd'hui) par rapport à la cible.
 * - Un jour sans aucun repas noté est ignoré (sinon il compterait comme un gros manque).
 * - Aujourd'hui ne compte qu'en excédent tant que la journée n'est pas finie.
 * extra = calories d'un repas pas encore ajouté (pour prévisualiser son effet).
 */
export function balance(db, ref = todayKey(), extra = 0) {
  const target = targetFor(db.profile);
  const days = [-2, -1].map(off => {
    const k = addDays(ref, off);
    const t = dayTotals(getDay(db, k));
    return { k, counted: t.hasFood, v: t.hasFood ? t.eaten - t.burned - target : 0 };
  });
  const t = dayTotals(getDay(db, ref));
  const raw = t.eaten + extra - t.burned - target;
  const today = { k: ref, counted: true, live: true, raw, v: Math.max(0, raw) };
  const sum = days.reduce((s, d) => s + d.v, 0) + today.v;
  const steps = clamp(Math.trunc(sum / STEP_KCAL), -MAX_STEPS, MAX_STEPS);
  return { days: [...days, today], sum, steps, pct: steps * STEP_PCT, target };
}

export function currentSession(db) {
  return SESSIONS[db.sessIdx % SESSIONS.length];
}

// Prochain jour d'entraînement (aujourd'hui inclus si aucune séance n'y a été faite).
export function nextTrainingDay(db, ref = todayKey()) {
  const days = db.profile?.days?.length ? db.profile.days : [0, 2, 4];
  const doneToday = db.sessions.some(s => s.date === ref);
  for (let i = doneToday ? 1 : 0; i < 8; i++) {
    const k = addDays(ref, i);
    if (days.includes(weekday(k))) return k;
  }
  return addDays(ref, 1);
}

/** Construit la séance du jour selon l'objectif et le bilan (steps de -4 à +4). */
export function buildPlan(session, goal, steps, loads = {}) {
  const G = GOALS[goal] || GOALS.maintien;
  const ex = session.ex.map((e, i) => {
    let d = 0;
    if (steps > 0 && (goal === 'prise' ? i < steps : steps >= 2 && i < 2)) d = 1;
    if (steps < 0 && ((steps <= -2 && i > 0) || (steps <= -4 && i === 0))) d = -1;
    const sets = e.s + d;
    const kg = e.kg ? loads[e.n] ?? e.kg : 0;
    return { name: e.n, sets, base: e.s, d, sec: e.sec || 0, reps: e.sec ? 0 : G.reps, kg, weighted: !!e.kg };
  });
  const finBase = G.fin;
  let fin = finBase;
  if (steps > 0 && goal !== 'prise') fin += steps * 3;
  if (steps < 0) fin = 0;
  let rest = 90;
  if (steps >= 3 && goal !== 'prise') rest = 60;
  if (steps < 0) rest = 120;
  const sets = ex.reduce((a, e) => a + e.sets, 0);
  const minutes = Math.round(WARM + (sets * (45 + rest)) / 60 + fin);
  return {
    session, goal, steps, pct: steps * STEP_PCT, ex, fin, finBase, rest, minutes,
    added: ex.filter(e => e.d > 0).length, removed: ex.filter(e => e.d < 0).length,
  };
}

export function planKcal(plan, weightKg) {
  const strengthMin = plan.minutes - plan.fin - WARM;
  return metKcal(4, weightKg, WARM) + metKcal(5, weightKg, strengthMin) + metKcal(8, weightKg, plan.fin);
}

export function specOf(e) {
  const work = e.sec ? `${e.sec} s` : `${e.reps} reps`;
  const load = e.weighted ? ` · ${String(e.kg).replace('.', ',')} kg` : e.sec ? '' : ' · poids du corps';
  return `${e.sets} × ${work}${load}`;
}

export function summary(plan) {
  const parts = [];
  if (plan.added) parts.push(`${plan.added} série${plan.added > 1 ? 's' : ''} en plus`);
  if (plan.removed) parts.push(`${plan.removed} série${plan.removed > 1 ? 's' : ''} en moins`);
  if (plan.fin > plan.finBase) parts.push(plan.finBase ? `cardio final de ${plan.fin} min au lieu de ${plan.finBase}` : `cardio final de ${plan.fin} min`);
  if (plan.fin < plan.finBase) parts.push('sans cardio final');
  if (plan.rest !== 90) parts.push(plan.rest < 90 ? 'repos plus courts' : 'repos plus longs');
  if (parts.length < 2) return parts[0] || '';
  return parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1];
}

/** Déroulé pas à pas pour le lecteur de séance. */
export function sequence(plan) {
  const out = [{ kind: 'timed', name: 'Échauffement', min: WARM, sub: `${WARM} min · mobilité et cardio léger` }];
  plan.ex.forEach(e => {
    for (let i = 1; i <= e.sets; i++) out.push({ kind: 'set', ex: e.name, name: e.name, i, n: e.sets, sec: e.sec, reps: e.reps, weighted: e.weighted });
  });
  if (plan.fin) out.push({ kind: 'timed', name: 'Cardio final', min: plan.fin, sub: `${plan.fin} min · vélo ou rameur`, finisher: true });
  return out;
}
