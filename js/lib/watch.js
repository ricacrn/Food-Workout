// Apple Watch : une webapp ne peut pas lire l'app Santé. Le pont, c'est un Raccourci iOS qui copie les
// entraînements de la montre dans le presse-papiers ; l'app lit ce texte. Format attendu, une ligne par entraînement :
//   Type | Date de début | Durée | Énergie active
// L'analyse est volontairement tolérante : l'écriture des dates, des durées et des unités dépend des réglages de l'iPhone.

const MONTHS = { jan: 1, fev: 2, feb: 2, mar: 3, avr: 4, apr: 4, mai: 5, may: 5, jui: 6, jun: 6, jul: 7, aou: 8, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const plain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const pad = n => String(n).padStart(2, '0');
const validDate = (y, m, d) => y > 2000 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

/** Trouve une date (et une heure) dans un texte. Renvoie { key: 'AAAA-MM-JJ', time: 'H:MM' } ou null. */
export function parseDate(str) {
  const s = plain(str);
  let y, m, d, rest = s;
  let x = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (x) { [y, m, d] = [+x[1], +x[2], +x[3]]; rest = s.slice(x.index + x[0].length); }
  if (!x) {
    x = s.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
    if (x) { [d, m, y] = [+x[1], +x[2], +x[3]]; if (y < 100) y += 2000; rest = s.slice(x.index + x[0].length); }
  }
  if (!x) {
    x = s.match(/(\d{1,2})(?:er)?\s+([a-z]{3,9})\.?,?\s+(\d{4})/); // 11 nov. 2026
    if (x && MONTHS[x[2].slice(0, 3)]) { d = +x[1]; m = x[2].startsWith('juil') ? 7 : x[2].startsWith('juin') ? 6 : MONTHS[x[2].slice(0, 3)]; y = +x[3]; rest = s.slice(x.index + x[0].length); }
    else x = null;
  }
  if (!x) {
    x = s.match(/([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/); // Nov 11, 2026
    if (x && MONTHS[x[1].slice(0, 3)]) { m = MONTHS[x[1].slice(0, 3)]; d = +x[2]; y = +x[3]; rest = s.slice(x.index + x[0].length); }
    else x = null;
  }
  if (!x || !validDate(y, m, d)) return null;
  let time = '';
  const t = rest.match(/(\d{1,2})\s?[:h]\s?(\d{2})(?::\d{2})?\s*(am|pm)?/);
  if (t) {
    let h = +t[1];
    if (t[3] === 'pm' && h < 12) h += 12;
    if (t[3] === 'am' && h === 12) h = 0;
    if (h < 24 && +t[2] < 60) time = `${h}:${t[2]}`;
  }
  return { key: `${y}-${pad(m)}-${pad(d)}`, time };
}

/** Durée en minutes : « 45:12 », « 1:02:33 », « 45 min », « 1 h 05 », « 2700 » (secondes). */
export function parseDuration(str) {
  const s = plain(str).replace(',', '.');
  let x = s.match(/(\d+):(\d{2}):(\d{2})/);
  if (x) return Math.round(+x[1] * 60 + +x[2] + +x[3] / 60);
  x = s.match(/(\d+):(\d{2})/);
  if (x) return Math.round(+x[1] + +x[2] / 60);
  x = s.match(/(\d+)\s*h(?:eures?|ours?|rs?)?[\s,.]*(\d+)?/);
  if (x) return +x[1] * 60 + (+x[2] || 0);
  x = s.match(/([\d.]+)\s*(s|sec|secondes?|seconds?)\b/);
  if (x) return Math.round(+x[1] / 60);
  x = s.match(/[\d.]+/);
  if (!x) return 0;
  const n = +x[0];
  return Math.round(n > 600 ? n / 60 : n); // un grand nombre sans unité : des secondes
}

/** Énergie en kcal : « 412 kcal », « 412,5 », « 1 724 kJ ». */
export function parseKcal(str) {
  const s = plain(str).replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1').replace(',', '.');
  const x = s.match(/[\d.]+/);
  if (!x) return 0;
  const n = +x[0];
  return Math.round(/kj/.test(s) ? n / 4.184 : n);
}

const LABELS = [
  [/traditional strength|musculation|strength training|force/, 'Musculation'],
  [/functional|fonctionnel/, 'Renforcement fonctionnel'],
  [/hiit|haute intensite|high intensity/, 'HIIT'],
  [/core|gainage|abdo/, 'Gainage'],
  [/run|course/, 'Course à pied'],
  [/walk|marche/, 'Marche'],
  [/hik|randon/, 'Randonnée'],
  [/cycl|velo|bik/, 'Vélo'],
  [/swim|natation|nage/, 'Natation'],
  [/tennis/, 'Tennis'],
  [/row|rameur|aviron/, 'Rameur'],
  [/ellip/, 'Elliptique'],
  [/stair|escalier/, 'Escaliers'],
  [/yoga/, 'Yoga'],
  [/pilates/, 'Pilates'],
  [/danc|danse/, 'Danse'],
  [/box/, 'Boxe'],
  [/foot|soccer/, 'Football'],
  [/ski|snow/, 'Ski'],
  [/padel/, 'Padel'],
];
export const isStrength = type => /strength|muscu|force|functional|fonctionnel|renfo/.test(plain(type));

function label(type) {
  const p = plain(type);
  const hit = LABELS.find(([re]) => re.test(p));
  if (hit) return hit[1];
  const clean = String(type || '').replace(/^HKWorkoutActivityType/, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1, 40) : 'Entraînement';
}

function workout(type, dateStr, durStr, kcalStr, today) {
  const dt = parseDate(dateStr);
  const w = {
    type: String(type || '').trim(), label: label(type), date: dt ? dt.key : today, time: dt ? dt.time : '',
    min: parseDuration(durStr), kcal: parseKcal(kcalStr), guessedDate: !dt,
  };
  w.wid = `${w.date}|${w.time}|${plain(w.type).slice(0, 20)}|${w.min}`;
  return w;
}

/**
 * Lit le texte copié par le Raccourci. Renvoie { workouts: [...], weight: kg|null }.
 * Accepte aussi un JSON { workouts: [{ type, start, duration_minutes, calories }] }.
 */
export function parseWatch(text, today) {
  const out = { workouts: [], weight: null };
  const raw = String(text || '').trim();
  if (!raw) return out;
  try {
    const j = JSON.parse(raw);
    const list = Array.isArray(j) ? j : j.workouts;
    if (Array.isArray(list)) {
      list.forEach(x => out.workouts.push(workout(x.type || x.name, x.start || x.date, String(x.duration_minutes ?? x.duration ?? x.min ?? ''), String(x.calories ?? x.kcal ?? x.energy ?? ''), today)));
      if (j.weight) out.weight = +j.weight || null;
    }
  } catch (e) { /* pas du JSON : format texte */ }
  if (!out.workouts.length) {
    raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
      const f = line.split(/\s*[|;\t]\s*/).map(x => x.trim());
      if (/^(poids|weight|masse)/.test(plain(f[0])) && f[1]) {
        const kg = parseFloat(plain(f[1]).replace(',', '.'));
        if (kg > 30 && kg < 300) out.weight = Math.round(kg * 10) / 10;
        return;
      }
      if (f.length < 3) return;
      // ordre conseillé : type | date | durée | énergie. On tolère l'énergie ailleurs si elle porte son unité.
      const ki = f.findIndex(x => /kcal|\bcal\b|kj/.test(plain(x)));
      const kcalStr = ki >= 0 ? f[ki] : f[3] || '';
      const rest = f.filter((_, i) => i !== ki);
      out.workouts.push(workout(rest[0], rest[1], rest[2] || '', kcalStr, today));
    });
  }
  out.workouts = out.workouts.filter(w => w.kcal > 0 && w.kcal < 5000 && w.min > 0 && w.min < 1000);
  return out;
}
