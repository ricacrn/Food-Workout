// Toutes les données restent sur le téléphone (localStorage).
// Pense à exporter une sauvegarde de temps en temps depuis Réglages.
const KEY = 'platepace.v1';

export const emptyDay = () => ({ entries: [], activities: [] });

export const defaultDb = () => ({
  version: 1,
  profile: null,
  days: {},
  progress: {},
  swaps: {},
  sessions: [],
  sessIdx: 0,
  choice: null, // séance choisie à la main pour la prochaine fois (sinon : celle du programme)
  gearV: 2,
  recents: [],
  favs: [], // repas habituels
  shop: { picks: [], checked: {}, extra: [] }, // liste de courses
  myRecipes: [], // recettes sur mesure (IA)
  plan: {}, // repas planifiés : { 'AAAA-MM-JJ': { dejeuner: idRecette, diner: idRecette } }
  planN: 1, // nombre de personnes pour les repas planifiés
  weights: [], // pesées : [{ date, kg }]
  gear: { active: 'salle', salle: null, maison: ['halteres', 'elastique'] }, // matériel par lieu (null = tout)
  workout: null,
  settings: { apiKey: '', model: 'claude-sonnet-5-5' },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultDb();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Lecture impossible, données réinitialisées', e);
    return defaultDb();
  }
}

// Remet à niveau des données d'une version précédente de l'app.
function migrate(data) {
  const base = defaultDb();
  const db = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  if (data.loads && !data.progress) {
    db.progress = {};
    Object.entries(data.loads).forEach(([name, kg]) => { db.progress[name] = { kg, hist: [] }; });
  }
  delete db.loads;
  if (db.workout && db.workout.v !== 2) db.workout = null; // séance en cours d'une ancienne version
  db.progress = db.progress || {};
  db.swaps = db.swaps || {};
  db.favs = Array.isArray(db.favs) ? db.favs : [];
  db.myRecipes = Array.isArray(db.myRecipes) ? db.myRecipes : [];
  db.shop = { picks: [], checked: {}, extra: [], ...(db.shop || {}) };
  db.plan = db.plan && typeof db.plan === 'object' ? db.plan : {};
  // on oublie les repas planifiés des jours passés
  const n = new Date();
  const tk = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  Object.keys(db.plan).forEach(k => { if (k < tk) delete db.plan[k]; });
  db.planN = db.planN > 0 ? db.planN : 1;
  db.weights = Array.isArray(db.weights) ? db.weights : [];
  db.gear = { ...base.gear, ...(db.gear || {}) };
  // v1.4 : la liste de matériel s'est agrandie. Dans une salle déjà réglée, les nouveautés sont cochées
  // d'office (à toi de décocher ce qui manque) ; à la maison, elles restent décochées.
  if (data.gearV !== 2) {
    const added = ['rack', 'smith', 'banc_incline', 'crossover', 'chaise', 'lombaires', 'tbar', 'trx', 'm_legext', 'm_adducteurs', 'm_abducteurs',
      'm_mollets', 'm_lat', 'm_dips', 'm_triceps', 'm_biceps', 'm_abdos', 'tapis', 'velo', 'rameur', 'elliptique', 'escalier'];
    if (Array.isArray(db.gear.salle)) db.gear.salle = [...new Set([...db.gear.salle, ...added])];
    db.gearV = 2;
  }
  return db;
}

export function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
    return false;
  }
}

export function getDay(db, k) {
  return db.days[k] || emptyDay();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Sauvegarde sans la clé API (elle ne doit jamais quitter le téléphone).
export async function exportFile(db) {
  const copy = { ...db, settings: { ...db.settings, apiKey: '' }, workout: null };
  const name = `plate-pace-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde Plate & Pace' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // partage annulé
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importFile(file, current) {
  const data = JSON.parse(await file.text());
  if (!data || typeof data !== 'object' || !data.days || !('profile' in data)) {
    throw new Error('Ce fichier n’est pas une sauvegarde Plate & Pace.');
  }
  const db = migrate({ ...data, workout: null });
  db.settings.apiKey = current.settings.apiKey;
  return db;
}

export function wipe() {
  localStorage.removeItem(KEY);
}
