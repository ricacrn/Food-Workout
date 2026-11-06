import { GOALS, targetFor, dayTotals } from './nutrition.js';
import { addDays, weekday, todayKey } from './dates.js';
import { getDay } from './store.js';

export const WARM = 6; // minutes d'échauffement
export const STEP_KCAL = 250; // écart qui déclenche un palier
export const STEP_PCT = 5; // % par palier
export const MAX_STEPS = 4; // ±20 %

/*
 * Bibliothèque d'exercices.
 * kind : 'kg' (charge), 'bw' (poids du corps, en répétitions), 'sec' (tenue, en secondes)
 * heavy : exercice où l'on pousse lourd → progression de 2,5 kg, pas au choix 1 / 2,5 / 5 / 10 kg
 *         sinon progression de 1 kg, pas au choix 0,5 / 1 / 2,5 kg
 * kg / reps / sec : point de départ suggéré (tu l'ajustes, l'app retient ta valeur)
 */
export const EXERCISES = {
  // Jambes
  'Squat': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre' },
  'Presse à cuisses': { kind: 'kg', kg: 80, heavy: true, gear: 'Machine' },
  'Hack squat': { kind: 'kg', kg: 40, heavy: true, gear: 'Machine' },
  'Goblet squat': { kind: 'kg', kg: 16, gear: 'Haltère ou kettlebell' },
  'Squat au poids du corps': { kind: 'bw', reps: 20, gear: 'Sans matériel' },
  'Fentes bulgares': { kind: 'kg', kg: 10, per: true, gear: 'Haltères + banc' },
  'Fentes marchées': { kind: 'kg', kg: 10, per: true, gear: 'Haltères' },
  'Step-up sur banc': { kind: 'kg', kg: 8, per: true, gear: 'Haltères + banc' },
  'Fentes au poids du corps': { kind: 'bw', reps: 12, side: true, gear: 'Sans matériel' },
  'Soulevé de terre roumain': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre' },
  'Soulevé de terre roumain haltères': { kind: 'kg', kg: 16, per: true, gear: 'Haltères' },
  'Hip thrust': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre + banc' },
  'Leg curl': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Pont fessier': { kind: 'bw', reps: 15, gear: 'Sans matériel' },
  'Soulevé de terre': { kind: 'kg', kg: 60, heavy: true, gear: 'Barre' },
  'Soulevé de terre trap bar': { kind: 'kg', kg: 60, heavy: true, gear: 'Trap bar' },
  // Poussée
  'Développé couché': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre + banc' },
  'Développé couché haltères': { kind: 'kg', kg: 14, per: true, gear: 'Haltères + banc' },
  'Presse pectoraux': { kind: 'kg', kg: 40, heavy: true, gear: 'Machine' },
  'Pompes': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Pompes sur les genoux': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Développé militaire haltères': { kind: 'kg', kg: 12, per: true, gear: 'Haltères' },
  'Développé militaire barre': { kind: 'kg', kg: 25, heavy: true, gear: 'Barre' },
  'Presse épaules': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Pompes piquées': { kind: 'bw', reps: 8, gear: 'Sans matériel' },
  'Dips': { kind: 'bw', reps: 8, gear: 'Barres parallèles' },
  'Développé couché prise serrée': { kind: 'kg', kg: 30, heavy: true, gear: 'Barre + banc' },
  'Pompes diamant': { kind: 'bw', reps: 10, gear: 'Sans matériel' },
  'Dips sur banc': { kind: 'bw', reps: 12, gear: 'Banc' },
  'Extensions triceps': { kind: 'kg', kg: 15, gear: 'Poulie' },
  'Barre au front': { kind: 'kg', kg: 20, gear: 'Barre EZ + banc' },
  'Extension haltère nuque': { kind: 'kg', kg: 12, gear: 'Haltère' },
  'Kickback haltère': { kind: 'kg', kg: 6, per: true, gear: 'Haltère' },
  // Tirage
  'Tractions': { kind: 'bw', reps: 6, gear: 'Barre de traction' },
  'Tirage vertical': { kind: 'kg', kg: 40, heavy: true, gear: 'Poulie haute' },
  'Tractions assistées': { kind: 'bw', reps: 8, gear: 'Élastique ou machine' },
  'Rowing inversé': { kind: 'bw', reps: 10, gear: 'Barre basse ou sangles' },
  'Rowing barre': { kind: 'kg', kg: 35, heavy: true, gear: 'Barre' },
  'Rowing haltère un bras': { kind: 'kg', kg: 16, gear: 'Haltère + banc' },
  'Tirage horizontal': { kind: 'kg', kg: 40, heavy: true, gear: 'Poulie basse' },
  'Rowing machine': { kind: 'kg', kg: 40, heavy: true, gear: 'Machine' },
  'Face pull': { kind: 'kg', kg: 15, gear: 'Poulie + corde' },
  'Oiseau haltères': { kind: 'kg', kg: 6, per: true, gear: 'Haltères' },
  'Pec deck inversé': { kind: 'kg', kg: 25, gear: 'Machine' },
  'Tirage élastique': { kind: 'bw', reps: 15, gear: 'Élastique' },
  'Curl biceps': { kind: 'kg', kg: 10, per: true, gear: 'Haltères' },
  'Curl marteau': { kind: 'kg', kg: 10, per: true, gear: 'Haltères' },
  'Curl barre EZ': { kind: 'kg', kg: 20, gear: 'Barre EZ' },
  'Curl poulie': { kind: 'kg', kg: 15, gear: 'Poulie basse' },
  // Gainage
  'Gainage': { kind: 'sec', sec: 45, gear: 'Sans matériel' },
  'Gainage latéral': { kind: 'sec', sec: 30, side: true, gear: 'Sans matériel' },
  'Dead bug': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Relevés de jambes': { kind: 'bw', reps: 10, gear: 'Barre ou banc' },
  'Roue abdominale': { kind: 'bw', reps: 8, gear: 'Roue' },
  'Pallof press': { kind: 'kg', kg: 10, gear: 'Poulie ou élastique' },
  'Rotation russe': { kind: 'bw', reps: 20, gear: 'Sans matériel' },
};

// Programme tournant (une séance après l'autre sur tes jours d'entraînement).
// n = exercice d'origine, s = séries, alts = remplacements possibles.
export const SESSIONS = [
  { id: 'lower', name: 'Bas du corps', ex: [
    { n: 'Squat', s: 4, alts: ['Presse à cuisses', 'Hack squat', 'Goblet squat', 'Squat au poids du corps'] },
    { n: 'Fentes bulgares', s: 3, alts: ['Fentes marchées', 'Step-up sur banc', 'Fentes au poids du corps'] },
    { n: 'Soulevé de terre roumain', s: 3, alts: ['Soulevé de terre roumain haltères', 'Hip thrust', 'Leg curl', 'Pont fessier'] },
    { n: 'Gainage', s: 3, alts: ['Dead bug', 'Relevés de jambes', 'Roue abdominale'] },
  ] },
  { id: 'push', name: 'Haut du corps · Poussée', ex: [
    { n: 'Développé couché', s: 4, alts: ['Développé couché haltères', 'Presse pectoraux', 'Pompes'] },
    { n: 'Développé militaire haltères', s: 3, alts: ['Développé militaire barre', 'Presse épaules', 'Pompes piquées'] },
    { n: 'Dips', s: 3, alts: ['Développé couché prise serrée', 'Pompes diamant', 'Dips sur banc'] },
    { n: 'Extensions triceps', s: 3, alts: ['Barre au front', 'Extension haltère nuque', 'Kickback haltère'] },
  ] },
  { id: 'pull', name: 'Haut du corps · Tirage', ex: [
    { n: 'Tractions', s: 4, alts: ['Tirage vertical', 'Tractions assistées', 'Rowing inversé'] },
    { n: 'Rowing barre', s: 3, alts: ['Rowing haltère un bras', 'Tirage horizontal', 'Rowing machine'] },
    { n: 'Face pull', s: 3, alts: ['Oiseau haltères', 'Pec deck inversé', 'Tirage élastique'] },
    { n: 'Curl biceps', s: 3, alts: ['Curl marteau', 'Curl barre EZ', 'Curl poulie'] },
  ] },
  { id: 'full', name: 'Full body', ex: [
    { n: 'Soulevé de terre', s: 4, alts: ['Soulevé de terre trap bar', 'Soulevé de terre roumain haltères', 'Hip thrust'] },
    { n: 'Pompes', s: 3, alts: ['Développé couché haltères', 'Pompes sur les genoux', 'Presse pectoraux'] },
    { n: 'Goblet squat', s: 3, alts: ['Presse à cuisses', 'Squat', 'Fentes marchées'] },
    { n: 'Gainage latéral', s: 3, alts: ['Pallof press', 'Rotation russe', 'Dead bug'] },
  ] },
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

export const metKcal = (met, kg, minutes) => Math.round((met * kg * Math.max(0, minutes)) / 60);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const roundKg = v => Math.max(0, Math.round(v * 4) / 4);
export const fmtKg = v => String(roundKg(v)).replace('.', ',');

export const exInfo = name => EXERCISES[name] || { kind: 'kg', kg: 10, gear: '' };
export const stepChoices = name => (exInfo(name).heavy ? [1, 2.5, 5, 10] : [0.5, 1, 2.5]);
export const progressStep = name => (exInfo(name).heavy ? 2.5 : 1);
export const defaultStep = name => (exInfo(name).heavy ? 2.5 : 1);

/** Charge / répétitions / secondes prévues pour la prochaine séance de cet exercice. */
export function currentTarget(db, name) {
  const e = exInfo(name);
  const p = (db.progress && db.progress[name]) || {};
  return { kg: p.kg ?? e.kg ?? 0, reps: p.reps ?? e.reps ?? 0, sec: p.sec ?? e.sec ?? 0 };
}

export const slotName = (db, slot, overrides = {}) => overrides[slot.n] || (db.swaps && db.swaps[slot.n]) || slot.n;

export const RATINGS = [
  { id: 'facile', label: 'Facile' },
  { id: 'bien', label: 'Bien' },
  { id: 'dur', label: 'Difficile' },
];

/**
 * Progression : à partir de ce que tu viens de faire et de ton ressenti.
 * - Facile → on monte d'un cran dès la prochaine fois.
 * - Bien → on monte d'un cran si la fois d'avant était déjà « Bien » ou « Facile ».
 * - Difficile → on garde ; deux fois « Difficile » de suite → on redescend d'un cran.
 */
export function nextTarget(name, entry, prevRating) {
  const e = exInfo(name);
  const r = entry.rating || 'bien';
  let dir = 0;
  if (r === 'facile') dir = 1;
  else if (r === 'bien' && (prevRating === 'bien' || prevRating === 'facile')) dir = 1;
  else if (r === 'dur' && prevRating === 'dur') dir = -1;
  if (e.kind === 'kg') return { dir, kg: roundKg(entry.kg + dir * progressStep(name)) };
  if (e.kind === 'bw') return { dir, reps: Math.max(3, entry.reps + dir * (r === 'facile' ? 2 : 1)) };
  return { dir, sec: Math.max(15, entry.sec + dir * (r === 'facile' ? 10 : 5)) };
}

/** Recalcule la cible d'un exercice à partir de son historique (après une séance ou un ressenti modifié). */
export function recompute(p, name) {
  const h = p.hist || [];
  if (!h.length) return;
  const last = h[h.length - 1];
  const prev = h.length > 1 ? h[h.length - 2].rating : null;
  const n = nextTarget(name, last, prev);
  delete n.dir;
  Object.assign(p, n);
}

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

/** Une ligne d'exercice prête pour la séance. */
export function exerciseEntry(db, slot, name, goal, d) {
  const G = GOALS[goal] || GOALS.maintien;
  const info = exInfo(name);
  const t = currentTarget(db, name);
  return {
    slot: slot.n, name, kind: info.kind, sets: slot.s + d, base: slot.s, d,
    reps: info.kind === 'kg' ? G.reps : info.kind === 'bw' ? t.reps : 0,
    sec: info.kind === 'sec' ? t.sec : 0,
    kg: info.kind === 'kg' ? t.kg : 0,
    heavy: !!info.heavy, per: !!info.per, side: !!info.side, gear: info.gear || '',
    alts: [slot.n, ...slot.alts],
  };
}

/** Construit la séance selon l'objectif et le bilan (steps de -4 à +4). */
export function buildPlan(session, goal, steps, db, overrides = {}) {
  const G = GOALS[goal] || GOALS.maintien;
  const ex = session.ex.map((slot, i) => {
    let d = 0;
    if (steps > 0 && (goal === 'prise' ? i < steps : steps >= 2 && i < 2)) d = 1;
    if (steps < 0 && ((steps <= -2 && i > 0) || (steps <= -4 && i === 0))) d = -1;
    return exerciseEntry(db, slot, slotName(db, slot, overrides), goal, d);
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
    session: { id: session.id, name: session.name }, goal, steps, pct: steps * STEP_PCT, ex, fin, finBase, rest, minutes,
    added: ex.filter(e => e.d > 0).length, removed: ex.filter(e => e.d < 0).length,
  };
}

export function planKcal(plan, weightKg) {
  const strengthMin = plan.minutes - plan.fin - WARM;
  return metKcal(4, weightKg, WARM) + metKcal(5, weightKg, strengthMin) + metKcal(8, weightKg, plan.fin);
}

export function workLabel(e) {
  if (e.kind === 'sec') return `${e.sec} s${e.side ? ' par côté' : ''}`;
  if (e.kind === 'bw') return `${e.reps} reps${e.side ? ' par jambe' : ''} · poids du corps`;
  return `${e.reps} reps · ${fmtKg(e.kg)} kg${e.per ? ' par main' : ''}`;
}

export const specOf = e => `${e.sets} × ${workLabel(e)}`;

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

/** Déroulé pas à pas pour le lecteur de séance. block = index du bloc (échauffement, exercices, cardio). */
export function sequence(plan) {
  const out = [{ kind: 'timed', block: 0, name: 'Échauffement', min: WARM, sub: `${WARM} min · mobilité et cardio léger` }];
  plan.ex.forEach((e, idx) => {
    for (let i = 1; i <= e.sets; i++) out.push({ kind: 'set', block: idx + 1, ex: idx, name: e.name, i, n: e.sets });
  });
  if (plan.fin) out.push({ kind: 'timed', block: plan.ex.length + 1, name: 'Cardio final', min: plan.fin, sub: `${plan.fin} min · vélo ou rameur`, finisher: true });
  return out;
}

export function blocks(plan) {
  return ['Échauffement', ...plan.ex.map(e => e.name), ...(plan.fin ? ['Cardio final'] : [])];
}
