// Toutes les données restent sur le téléphone (localStorage).
// Pense à exporter une sauvegarde de temps en temps depuis Réglages.
const KEY = 'platepace.v1';

export const emptyDay = () => ({ entries: [], activities: [] });

export const defaultDb = () => ({
  version: 1,
  profile: null,
  days: {},
  loads: {},
  sessions: [],
  sessIdx: 0,
  recents: [],
  workout: null,
  settings: { apiKey: '', model: 'claude-sonnet-5-5' },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultDb();
    const data = JSON.parse(raw);
    const base = defaultDb();
    return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  } catch (e) {
    console.warn('Lecture impossible, données réinitialisées', e);
    return defaultDb();
  }
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
export function exportFile(db) {
  const copy = { ...db, settings: { ...db.settings, apiKey: '' }, workout: null };
  const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plate-pace-${new Date().toISOString().slice(0, 10)}.json`;
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
  const base = defaultDb();
  return {
    ...base,
    ...data,
    workout: null,
    settings: { ...base.settings, ...(data.settings || {}), apiKey: current.settings.apiKey },
  };
}

export function wipe() {
  localStorage.removeItem(KEY);
}
